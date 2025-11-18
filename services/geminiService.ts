

import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import `ServiceType` to use the enum and fix type errors.
import { ExtractedReservation, ServiceType } from '../types';

export const extractReservationDetails = async (text: string): Promise<ExtractedReservation | null> => {
  if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set.");
    // Return mock data for development if API key is not available
    return {
      title: "Extracted: JFK to Manhattan",
      clientName: "Jane Doe (from AI)",
      pickupAddress: "JFK International Airport",
      dropoffAddress: "1 Times Square, New York, NY",
      pickupTime: new Date().toISOString(),
      // FIX: Use the `ServiceType` enum member instead of a raw string to satisfy TypeScript.
      serviceType: ServiceType.AIRPORT_TRANSFER,
      numberOfPassengers: 2,
      clientPrice: 120.50,
      specialRequests: "Has 2 large bags. Needs a child seat.",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract the following details from the reservation text and provide a JSON object. If a detail is not present, omit the key.
        - title: A short summary of the service (e.g., "JFK to Manhattan").
        - clientName: The name of the client.
        - pickupAddress: The full pickup location.
        - dropoffAddress: The full dropoff location.
        - pickupTime: The pickup time in ISO 8601 format.
        - serviceType: One of 'AIRPORT_TRANSFER', 'HOTEL_TRANSFER', 'CITY_TOUR', 'WINE_TOUR', 'CUSTOM'.
        - numberOfPassengers: The number of passengers.
        - clientPrice: The price for the client.
        - specialRequests: Any special notes, flight numbers, or requests.

        Reservation Text:
        ---
        ${text}
        ---`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short summary of the service." },
            clientName: { type: Type.STRING, description: "The name of the client." },
            pickupAddress: { type: Type.STRING, description: "The full pickup location." },
            dropoffAddress: { type: Type.STRING, description: "The full dropoff location." },
            pickupTime: { type: Type.STRING, description: "The pickup time in ISO 8601 format." },
            // FIX: Use `Object.values(ServiceType)` to dynamically and correctly provide all possible enum values to the model, fixing a bug where 'WINE_TOUR' was missing.
            serviceType: { type: Type.STRING, enum: Object.values(ServiceType) },
            numberOfPassengers: { type: Type.INTEGER },
            clientPrice: { type: Type.NUMBER },
            specialRequests: { type: Type.STRING, description: "Any special notes or requests." },
          },
        },
      },
    });

    const jsonString = response.text.trim();
    if (jsonString) {
      return JSON.parse(jsonString) as ExtractedReservation;
    }
    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return null;
  }
};

export const getFinancialInsights = async (financialData: any, query: string): Promise<string | null> => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY not set. Returning mock AI financial insights.");
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `Mock AI Response: Based on the provided data, total revenue is $${financialData.totalRevenue.toFixed(2)} and net profit is $${financialData.netProfit.toFixed(2)}. The most profitable driver appears to be ${financialData.reports.profitByDriver[0]?.label || 'N/A'}, contributing $${financialData.reports.profitByDriver[0]?.value.toFixed(2) || '0.00'}.`;
    }

    // A simple clean up to remove deeply nested objects that might not be relevant for high-level analysis
    const simplifiedData = {
        totalRevenue: financialData.totalRevenue,
        totalCosts: financialData.totalCosts,
        netProfit: financialData.netProfit,
        totalServicesCount: financialData.totalServicesCount,
        accountsReceivable: financialData.accountsReceivable,
        accountsPayable: financialData.accountsPayable,
        totalCommission: financialData.totalCommission,
        reports: financialData.reports,
    };

    const prompt = `
        You are an expert financial analyst for a tour and transfer company.
        Your task is to analyze the following financial data for a selected period and answer the user's question concisely.
        Provide clear, insightful, and easy-to-understand summaries. Use bullet points for lists if it improves clarity.
        Do not invent data. Base all your answers strictly on the JSON data provided.

        FINANCIAL DATA:
        ---
        ${JSON.stringify(simplifiedData, null, 2)}
        ---

        USER'S QUESTION:
        ---
        ${query}
        ---

        YOUR ANALYSIS:
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for financial insights:", error);
        throw new Error("Failed to get insights from AI service.");
    }
};