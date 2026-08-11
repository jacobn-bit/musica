"use strict";

const reviewSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overview", "sound", "impact", "legacy", "tagline",
    "alternativeTaglines", "definingMoments", "mostPopularTrack",
    "muzeScore", "scoreExplanation", "raterCount", "factualWarnings"
  ],
  properties: {
    overview: { type: "string", minLength: 1 },
    sound: { type: "string", minLength: 1 },
    impact: { type: "string", minLength: 1 },
    legacy: { type: "string", minLength: 1 },
    tagline: { type: "string", minLength: 1 },
    alternativeTaglines: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: { type: "string", minLength: 1 }
    },
    definingMoments: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["trackPosition", "trackTitle", "explanation"],
        properties: {
          trackPosition: { type: "integer", minimum: 1 },
          trackTitle: { type: "string", minLength: 1 },
          explanation: { type: "string", minLength: 1 }
        }
      }
    },
    mostPopularTrack: {
      type: "object",
      additionalProperties: false,
      required: ["title", "explanation"],
      properties: {
        title: { type: "string", minLength: 1 },
        explanation: { type: "string", minLength: 1 }
      }
    },
    muzeScore: { type: "number", minimum: 1, maximum: 10 },
    scoreExplanation: { type: "string", minLength: 1 },
    raterCount: { type: "integer", minimum: 1 },
    factualWarnings: { type: "array", items: { type: "string", minLength: 1 } }
  }
};

const qualitySchema = {
  type: "object",
  additionalProperties: false,
  required: ["passed", "overallScore", "problems"],
  properties: {
    passed: { type: "boolean" },
    overallScore: { type: "integer", minimum: 0, maximum: 100 },
    problems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "severity", "explanation", "suggestedCorrection"],
        properties: {
          field: { type: "string", minLength: 1 },
          severity: { type: "string", enum: ["minor", "major", "critical"] },
          explanation: { type: "string", minLength: 1 },
          suggestedCorrection: { type: "string" }
        }
      }
    }
  }
};

const sectionSchemas = {
  overview: scalarSection("overview"),
  sound: scalarSection("sound"),
  impact: scalarSection("impact"),
  legacy: scalarSection("legacy"),
  score: {
    type: "object",
    additionalProperties: false,
    required: ["muzeScore", "scoreExplanation", "raterCount", "benchmarkComparison"],
    properties: {
      muzeScore: { type: "number", minimum: 1, maximum: 10 },
      scoreExplanation: { type: "string", minLength: 1 },
      raterCount: { type: "integer", minimum: 1 },
      benchmarkComparison: { type: "string", minLength: 1 }
    }
  },
  definingMoments: {
    type: "object",
    additionalProperties: false,
    required: ["definingMoments"],
    properties: { definingMoments: reviewSchema.properties.definingMoments }
  }
};

function scalarSection(field) {
  return {
    type: "object",
    additionalProperties: false,
    required: [field],
    properties: { [field]: { type: "string", minLength: 1 } }
  };
}

module.exports = { reviewSchema, qualitySchema, sectionSchemas };
