CREATE TYPE "public"."layer_role" AS ENUM('owner', 'guest');--> statement-breakpoint
CREATE TABLE "card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" varchar(500),
	"article" text,
	"start_year" integer NOT NULL,
	"start_month" integer,
	"start_day" integer,
	"end_year" integer,
	"end_month" integer,
	"end_day" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_layer" (
	"card_id" uuid NOT NULL,
	"layer_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_layer_card_id_layer_id_pk" PRIMARY KEY("card_id","layer_id")
);
--> statement-breakpoint
CREATE TABLE "layer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_layer" (
	"user_id" uuid NOT NULL,
	"layer_id" uuid NOT NULL,
	"role" "layer_role" DEFAULT 'guest' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_layer_user_id_layer_id_pk" PRIMARY KEY("user_id","layer_id")
);
--> statement-breakpoint
ALTER TABLE "card_layer" ADD CONSTRAINT "card_layer_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_layer" ADD CONSTRAINT "card_layer_layer_id_layer_id_fk" FOREIGN KEY ("layer_id") REFERENCES "public"."layer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_layer" ADD CONSTRAINT "user_layer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_layer" ADD CONSTRAINT "user_layer_layer_id_layer_id_fk" FOREIGN KEY ("layer_id") REFERENCES "public"."layer"("id") ON DELETE cascade ON UPDATE no action;