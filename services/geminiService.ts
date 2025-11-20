
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedReservation, ServiceType } from '../types';

export const extractReservationDetails = async (text: string): Promise<ExtractedReservation | null> => {
  if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set.");
    // Return mock data for development if API key is not available
    return {
      title: "Extracted: JFK to Manhattan",
      clientName: "Jane Doe (from AI)",
      clientEmail: "jane.doe@example.com",
      clientPhone: "+15550199",
      flightNumber: "AA100",
      pickupAddress: "JFK International Airport",
      stopAddress: "Rockefeller Center",
      dropoffAddress: "1 Times Square, New York, NY",
      pickupTime: new Date().toISOString(),
      serviceType: ServiceType.TRANSFER_WITH_STOP,
      numberOfPassengers: 2,
      passengersAdults: 2,
      passengersKids: 0,
      clientPrice: 120.50,
      paymentMethod: "Cash",
      specialRequests: "Has 2 large bags. Needs a child seat.",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Advanced System Instruction for the Model
    const prompt = `
    You are an expert reservation assistant for a luxury Chauffeur & Transfer company. 
    Your goal is to extract structured data from unstructured reservation text (emails, WhatsApp messages, notes) and normalize it.
    
    **Current Context:**
    - Today's Date: ${dateString}
    - Use this to resolve relative dates like "tomorrow", "next Friday", "this weekend".
    - If the year is missing, assume the next upcoming occurrence of that date relative to today.

    **Reasoning & Extraction Rules:**

    1.  **Service Type Inference (CRITICAL):**
        - **${ServiceType.TRANSFER}**: Direct point-to-point (e.g., Airport -> Hotel, Station -> Address).
        - **${ServiceType.TRANSFER_WITH_STOP}**: Mention of "via", "stop at", "waypoint", or two destinations before the final one.
        - **${ServiceType.TOUR}**: Keywords: "tour", "sightseeing", "excursion", "disposal", "hourly", "at disposal", "visit".
        - **${ServiceType.CUSTOM}**: Complex itineraries, weddings, events.

    2.  **Title Generation:**
        - Generate a concise, professional summary title (max 6 words).
        - Format for Transfer: "Transfer: [Origin] -> [Destination]" (e.g., "Transfer: JFK -> Plaza Hotel").
        - Format for Tour: "Tour: [Main Attraction]" (e.g., "Tour: Amalfi Coast Full Day").

    3.  **Contact Details:**
        - Extract Name, Phone, Email. 
        - If phone has no country code, try to infer or leave as is.

    4.  **Logistics:**
        - **Flight/Train/Ship**: Extract codes like "BA123", "UA 990", "Frecciarossa 9600".
        - **Pickup/Dropoff**: Be precise.
        - **Stop**: If a stop is mentioned (e.g., "stop at Pompeii"), extract it.
        - **Date/Time**: output ISO 8601 format.

    5.  **Financials:**
        - **Price**: Extract total price if mentioned.
        - **Payment Method**: Infer strictly from these categories:
            - "Cash" (keywords: cash, pay driver, on board)
            - "Prepaid" (keywords: paid, stripe, credit card, paypal, already paid)
            - "Future Invoice" (keywords: bill me, invoice later, company account)
            - "Pay to the driver" (explicit)
            - "Paid deposit + balance to the driver" (if deposit mentioned)

    6.  **Passengers:**
        - Distinguish Adults vs Kids if possible.
        - "3 pax" = 3 Adults, 0 Kids.
        - "2 adults 1 child" = 2 Adults, 1 Kid.

    **Input Text to Analyze:**
    """
    ${text}
    """
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short summary title for the calendar event." },
            clientName: { type: Type.STRING },
            clientEmail: { type: Type.STRING },
            clientPhone: { type: Type.STRING },
            flightNumber: { type: Type.STRING, description: "Flight, Train, or Ship number e.g. BA123" },
            pickupAddress: { type: Type.STRING },
            stopAddress: { type: Type.STRING, description: "Intermediate stop or waypoint if any" },
            dropoffAddress: { type: Type.STRING },
            pickupTime: { type: Type.STRING, description: "ISO 8601 Date Time string" },
            serviceType: { type: Type.STRING, enum: Object.values(ServiceType) },
            numberOfPassengers: { type: Type.INTEGER, description: "Total count" },
            passengersAdults: { type: Type.INTEGER },
            passengersKids: { type: Type.INTEGER },
            clientPrice: { type: Type.NUMBER },
            paymentMethod: { type: Type.STRING, enum: ["Cash", "Prepaid", "Future Invoice", "Pay to the driver", "Paid deposit + balance to the driver"] },
            specialRequests: { type: Type.STRING, description: "Luggage, child seats, notes, and extra details not covered elsewhere." },
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `Mock AI Response: Based on the provided data, total revenue is $${financialData.totalRevenue.toFixed(2)} and net profit is $${financialData.netProfit.toFixed(2)}.`;
    }

    const simplifiedData = {
        totalRevenue: financialData.totalRevenue,
        totalCosts: financialData.totalCosts,
        netProfit: financialData.netProfit,
        totalServicesCount: financialData.totalServicesCount,
        reports: financialData.reports,
    };

    const prompt = `
        You are a financial analyst. Analyze this JSON data and answer the user's question concisely.
        
        DATA:
        ${JSON.stringify(simplifiedData, null, 2)}
        
        QUESTION:
        ${query}
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
