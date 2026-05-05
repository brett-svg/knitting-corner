Yarn Inventory Web App Plan

Product Vision

Create a modern, private web application that helps crafters manage their yarn, tools, patterns, and projects in one place. The goal is not to replicate large community platforms like Ravelry, but to build a clean, fast, and highly personalized “craft command center.”

This product should answer three core questions:

What do I own?

Where is it stored?

What can I make with it?

Core Features

1. Inventory Management

Yarn Stash

Brand, colorway, dye lot

Yarn weight (DK, worsted, etc.)

Fiber content

Yardage per skein

Number of skeins

Photos

Storage location

Tags

Needles & Hooks

Size (mm/US)

Type (circular, DPN, interchangeable)

Length

Material

Quantity

Notions

Stitch markers, cables, scissors, etc.

Quantity and storage location

2. Patterns Library

Upload PDFs or store external links

Designer name

Required yarn weight and yardage

Suggested needle sizes

Notes and tags

3. Projects System

Track projects across stages:

Planned

Active (WIP)

Paused

Completed

Each project includes:

Linked pattern

Assigned yarn

Assigned needles/tools

Notes and progress tracking

Photos

4. Dashboard

Active projects overview

Recently added yarn

Reserved inventory

Quick actions

AI Yarn Label Scanner (Core Differentiator)

Objective

Allow users to scan a yarn label using their camera and automatically populate inventory fields with high accuracy.

Capabilities

The system extracts and structures:

Brand

Product line

Fiber composition

Yarn weight category

Yardage and meters

Skein weight (grams)

Colorway

Dye lot

Needle size (optional)

Users always review and edit before saving.

User Flow

User taps “Add Yarn”

Selects “Scan Label”

Takes 1 or 2 photos (front/back)

System processes image (2–4 seconds)

Pre-filled form appears

User edits if needed

Saves to inventory

AI Architecture

Model

Latest multimodal model (e.g., GPT-4.1 or GPT-4o class)

Approach

Structured extraction (not OCR)

Inference for missing values

Structured Output Schema

{
  "brand": "string | null",
  "product_line": "string | null",
  "fiber": "string | null",
  "weight_category": "string | null",
  "yardage": "number | null",
  "meters": "number | null",
  "skein_weight_grams": "number | null",
  "colorway": "string | null",
  "dye_lot": "string | null",
  "needle_size": "string | null"
}

API Design

Endpoint

POST /api/scan-yarn-label

Flow

Accept image(s)

Send to AI model

Return structured JSON

Example Implementation (Next.js)

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { images } = req.body;

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Extract yarn label data and return structured output."
          },
          ...images.map(url => ({ type: "input_image", image_url: url }))
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "yarn_label",
        schema: {
          type: "object",
          properties: {
            brand: { type: ["string", "null"] },
            product_line: { type: ["string", "null"] },
            fiber: { type: ["string", "null"] },
            weight_category: { type: ["string", "null"] },
            yardage: { type: ["number", "null"] },
            meters: { type: ["number", "null"] },
            skein_weight_grams: { type: ["number", "null"] },
            colorway: { type: ["string", "null"] },
            dye_lot: { type: ["string", "null"] },
            needle_size: { type: ["string", "null"] }
          }
        }
      }
    }
  });

  res.status(200).json(response.output_parsed);
}

Enhancements

Dual Image Input

Front + back label improves accuracy significantly

Normalization Layer

Standardize yarn weights and fiber terms

Confidence Handling

Highlight uncertain fields

Yarn Matching System (Future)

Match against known yarn database

Auto-complete full details

MVP Scope

Authentication

Yarn inventory

Needle/hook inventory

Pattern library

Projects tracking

Image upload

Search/filter

Assign yarn to projects

AI label scanning (included in MVP)

Technical Architecture

Frontend

Next.js

Tailwind CSS

Backend

Supabase (PostgreSQL)

Auth

Supabase Auth or Clerk

Storage

Supabase Storage or S3

Hosting

Vercel

AI Service Layer

Centralized service wrapper for model calls

Enables easy upgrades and provider swaps

Data Model

Core tables:

users

yarns

needles

hooks

notions

patterns

projects

project_yarns

project_tools

storage_locations

photos

tags

Yarn Table (AI-aligned fields)

brand

product_line

fiber

weight_category

yardage

meters

skein_weight_grams

colorway

dye_lot

needle_size

image_url

storage_location_id

Build Roadmap

Phase 1: Foundation

Project setup

Auth

Database schema

Phase 2: Inventory

Yarn entry form

Image upload

Stash UI

Phase 3: AI Integration

Image upload flow

AI API endpoint

Structured output parsing

Prefilled form UI

Phase 4: Projects & Patterns

Pattern library

Project system

Assignment logic

Phase 5: Dashboard

Overview screen

Quick actions

Phase 6: Enhancements

Dual image support

Normalization layer

Matching system

Phase 7: Polish

Mobile optimization

UI refinement

Performance tuning

Long-Term Vision

Mobile app

Barcode scanning

Smart recommendations

Project timelines

External integrations

Summary

This product should feel like a modern, elegant system that replaces spreadsheets and scattered tools. The AI layer removes friction from data entry, making the system fast enough to use daily. The combination of inventory, planning, and intelligent scanning creates a highly differentiated experience.

