import React, { useState } from 'react';
import { extractReservationDetails } from '../../services/geminiService';
import { ExtractedReservation } from '../../types';

interface ReservationExtractorProps {
  onExtraction: (data: ExtractedReservation) => void;
}

export const ReservationExtractor: React.FC<ReservationExtractorProps> = ({ onExtraction }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!inputText.trim()) {
      setError("Please paste some reservation details first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await extractReservationDetails(inputText);
      if (result) {
        onExtraction(result);
        setInputText(''); // Clear on success
      } else {
        setError("AI extraction failed. Please ensure the text contains clear details (like names, addresses, and times) and try again.");
      }
    } catch (err) {
      setError("An error occurred while contacting the AI service. Please check your connection and try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 p-4 rounded-lg h-full flex flex-col">
      <h3 className="text-lg font-semibold text-slate-800 flex items-center">
        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
        AI Assistant
      </h3>
      <p className="text-sm text-slate-500 mt-1 mb-4">
        Paste reservation details from an email or notes to auto-fill the form.
      </p>
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="e.g., Confirmation for John Doe, flight BA212 arriving at JFK on Oct 28 at 3:15 PM, going to The Plaza Hotel..."
        className="w-full flex-1 border-slate-300 rounded-lg shadow-sm text-sm p-3 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        rows={10}
        disabled={isLoading}
      />
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <button
        onClick={handleExtract}
        disabled={isLoading}
        className="mt-4 w-full flex justify-center items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Extracting...
          </>
        ) : (
          'Extract & Fill Form'
        )}
      </button>
    </div>
  );
};