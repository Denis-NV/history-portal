import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";

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
          envs: [{ name: "NODE_ENV", value: "production" }],
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
