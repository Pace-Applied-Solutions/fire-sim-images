/**
 * Types for the prompt generation engine.
 */
import type { ViewPoint } from '../types.js';
/**
 * A single prompt for a specific viewpoint.
 */
export interface GeneratedPrompt {
    viewpoint: ViewPoint;
    promptText: string;
    promptSetId: string;
    templateVersion: string;
}
/**
 * Complete set of prompts generated for a scenario.
 */
export interface PromptSet {
    id: string;
    templateVersion: string;
    prompts: GeneratedPrompt[];
    createdAt: string;
}
/**
 * Structured template for prompt generation.
 */
export interface PromptTemplate {
    id: string;
    version: string;
    sections: {
        style: string;
        behaviorPrinciples: string;
        referenceImagery: (data: PromptData) => string;
        locality: (data: PromptData) => string;
        terrain: (data: PromptData) => string;
        features: (data: PromptData) => string;
        vegetation: (data: PromptData) => string;
        fireGeometry: (data: PromptData) => string;
        fireBehavior: (data: PromptData) => string;
        weather: (data: PromptData) => string;
        perspective: (viewpoint: ViewPoint) => string;
        safety: string;
    };
}
/**
 * Data used to fill prompt templates.
 */
export interface PromptData {
    /** Vegetation type (e.g., 'Dry Sclerophyll Forest') */
    vegetationType: string;
    /** Detailed vegetation characteristics */
    vegetationDetails: {
        canopyHeight: string;
        canopyType: string;
        understorey: string;
        groundFuel: string;
        fuelLoad: string;
        flammability: string;
    };
    /** Deprecated: use vegetationDetails instead */
    vegetationDescriptor: string;
    terrainDescription: string;
    elevation: number;
    nearbyFeatures: string;
    fireStage: string;
    intensityDescription: IntensityVisuals;
    flameHeight: string;
    smokeDescription: string;
    spreadDirection: string;
    windDescription: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    timeOfDayLighting: string;
    /** Explicit flame height in metres (from trainer input) */
    explicitFlameHeightM?: number;
    /** Explicit rate of spread in km/h (from trainer input) */
    explicitRateOfSpreadKmh?: number;
    /** Fire area in hectares */
    fireAreaHectares: number;
    /** Fire extent north to south in kilometres */
    fireExtentNorthSouthKm: number;
    /** Fire extent east to west in kilometres */
    fireExtentEastWestKm: number;
    /** Fire shape descriptor (e.g., 'elongated', 'roughly circular') */
    fireShape: string;
    /** Locality description (e.g., "near Bungendore, New South Wales") */
    locality?: string;
}
/**
 * Visual characteristics for a given fire intensity level.
 */
export interface IntensityVisuals {
    flameHeight: string;
    smoke: string;
    crownInvolvement: string;
    spotting: string;
    descriptor: string;
}
//# sourceMappingURL=promptTypes.d.ts.map