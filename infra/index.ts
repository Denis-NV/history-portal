import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";
import * as neon from "@pulumi/neon";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
const config = new pulumi.Config();

// GCP configuration is read from Pulumi.<stack>.yaml (e.g., Pulumi.staging.yaml)
// See: https://www.pulumi.com/docs/concepts/config/
const gcpConfig = new pulumi.Config("gcp");
const project = gcpConfig.require("project");

// Region is set in Pulumi.<stack>.yaml under gcp:region
// UK users should use europe-west2 (London)
// See all regions: https://cloud.google.com/compute/docs/regions-zones
const region = gcpConfig.get("region") || "europe-west2";

// Neon configuration
// Neon uses AWS regions, not GCP regions
// See: https://neon.tech/docs/introduction/regions
const appConfig = new pulumi.Config("app");
const neonRegion = appConfig.get("neonRegion") || "aws-eu-west-2"; // London
const neonOrgId = appConfig.require("neonOrgId");

// ─────────────────────────────────────────────────────────────────────────────
// Auth Secrets Configuration
// Set via: pulumi config set --secret <key> <value>
// ─────────────────────────────────────────────────────────────────────────────
const betterAuthSecret = config.requireSecret("betterAuthSecret");
const googleClientId = config.requireSecret("googleClientId");
const googleClientSecret = config.requireSecret("googleClientSecret");
const resendApiKey = config.requireSecret("resendApiKey");
const emailFrom = config.require("emailFrom"); // Not secret, just config

// Returns the current stack name (e.g., "staging" or "prod")
// Used to namespace resources: portal-staging, portal-prod
const stack = pulumi.getStack();

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Registry - Docker image storage
// GCP's container registry for storing Docker images
// Console: https://console.cloud.google.com/artifacts?project=history-portal
// ─────────────────────────────────────────────────────────────────────────────
const repository = new gcp.artifactregistry.Repository("portal-repo", {
  repositoryId: "portal",
  location: region,
  format: "DOCKER",
  description: "Docker repository for portal images",
});

// Registry URL format: <region>-docker.pkg.dev/<project>/<repository>
const registryUrl = pulumi.interpolate`${region}-docker.pkg.dev/${project}/portal`;

// ─────────────────────────────────────────────────────────────────────────────
// Docker Image - Build and push to Artifact Registry
// ─────────────────────────────────────────────────────────────────────────────

// Image tag includes stack name and timestamp for unique identification
const imageName = pulumi.interpolate`${registryUrl}/portal:${stack}-${Date.now()}`;

const image = new docker.Image(
  "portal-image",
  {
    imageName: imageName,
    build: {
      context: "..", // Root of monorepo (relative to infra/)
      dockerfile: "../packages/portal/Dockerfile",
      platform: "linux/amd64", // Cloud Run requires linux/amd64
    },
    registry: {
      server: pulumi.interpolate`${region}-docker.pkg.dev`,
      // "oauth2accesstoken" is the magic username for GCP OAuth2 authentication
      // See: https://cloud.google.com/artifact-registry/docs/docker/authentication
      username: "oauth2accesstoken",
      // Access token from current gcloud auth (via `gcloud auth application-default login`)
      password: pulumi.secret(
        gcp.organizations.getClientConfig().then((c) => c.accessToken)
      ),
    },
  },
  { dependsOn: [repository] }
);

// ─────────────────────────────────────────────────────────────────────────────
// Neon Database - Serverless PostgreSQL
// Console: https://console.neon.tech
// ─────────────────────────────────────────────────────────────────────────────
const neonProject = new neon.Project("history-portal", {
  name: `history-portal-${stack}`,
  regionId: neonRegion,
  pgVersion: 17,
  orgId: neonOrgId,
  historyRetentionSeconds: 21600, // 6 hours (free tier max)
  defaultEndpointSettings: {
    autoscalingLimitMinCu: 0.25, // Minimum compute (cost-effective)
    autoscalingLimitMaxCu: 1, // Maximum compute
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Run Service
// Serverless container platform - pay only for what you use
// Console: https://console.cloud.google.com/run?project=history-portal
// ─────────────────────────────────────────────────────────────────────────────
const service = new gcp.cloudrun.Service("portal", {
  name: `portal-${stack}`, // e.g., "portal-staging" or "portal-prod"
  location: region,
  template: {
    spec: {
      containers: [
        {
          image: image.imageName,
          ports: [{ containerPort: 3000 }],
          resources: {
            limits: {
              memory: "512Mi",
              cpu: "1",
            },
          },
          envs: [
            { name: "NODE_ENV", value: "production" },
            {
              name: "DATABASE_URL",
              value: neonProject.connectionUri,
            },
            // Auth configuration
            { name: "BETTER_AUTH_SECRET", value: betterAuthSecret },
            { name: "GOOGLE_CLIENT_ID", value: googleClientId },
            { name: "GOOGLE_CLIENT_SECRET", value: googleClientSecret },
            { name: "RESEND_API_KEY", value: resendApiKey },
            { name: "EMAIL_FROM", value: emailFrom },
            // NEXT_PUBLIC_APP_URL is set via config since Cloud Run URL is dynamic
            // Use: pulumi config set appUrl "https://portal-staging-xxx.run.app"
            // Or use a custom domain once configured
            { name: "NEXT_PUBLIC_APP_URL", value: config.require("appUrl") },
            { name: "BETTER_AUTH_URL", value: config.require("appUrl") },
          ],
        },
      ],
      containerConcurrency: 80,
      timeoutSeconds: 300,
    },
    metadata: {
      annotations: {
        // Knative autoscaling annotations for Cloud Run
        // minScale: 0 = scale to zero when idle (cost-effective for staging)
        // maxScale: 3 = limit concurrent instances (cost control)
        // See: https://cloud.google.com/run/docs/configuring/min-instances
        "autoscaling.knative.dev/minScale": "0",
        "autoscaling.knative.dev/maxScale": "3",
      },
    },
  },
  // Traffic routing: 100% to latest revision
  // For canary deployments, you can split traffic between revisions
  traffics: [
    {
      percent: 100,
      latestRevision: true,
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// IAM - Allow public access (unauthenticated)
//
// Q: Why use IAM with "allUsers" instead of "Allow public access" in Console?
// A: Both achieve public access, but IAM is the recommended approach because:
//    - It keeps the service under IAM control (auditable, can be reverted)
//    - "Allow public access" checkbox just sets this same IAM binding
//    - Using Pulumi ensures infrastructure-as-code consistency
//
// Console: https://console.cloud.google.com/run?project=history-portal
// Docs: https://cloud.google.com/run/docs/authenticating/public
// ─────────────────────────────────────────────────────────────────────────────
const invoker = new gcp.cloudrun.IamMember("portal-invoker", {
  service: service.name,
  location: region,
  role: "roles/run.invoker",
  // "allUsers" = anyone on the internet (no authentication required)
  // For authenticated access, use "allAuthenticatedUsers" or specific principals
  member: "allUsers",
});

// ─────────────────────────────────────────────────────────────────────────────
// Outputs
// ─────────────────────────────────────────────────────────────────────────────
export const serviceUrl = service.statuses[0].url;
export const serviceName = service.name;
export const imageUrl = image.imageName;

// Neon outputs (connection string is secret)
export const neonProjectId = neonProject.id;
export const databaseConnectionUri = pulumi.secret(neonProject.connectionUri);
