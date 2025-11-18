import React, { useState, useCallback } from 'react';
import { getFinancialInsights } from '../../services/geminiService';

interface AIFinancialAssistantProps {
  financialData: any;
}

const examplePrompts = [
    "Summarize our performance for this period.",
    "Who was the most profitable driver?",
    "What was our total revenue from city tours?",
    "Are there any services with negative profit?",
];

export const AIFinancialAssistant: React.FC<AIFinancialAssistantProps> = ({ financialData }) => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetInsights = useCallback(async (prompt?: string) => {
        const currentQuery = prompt || query;
        if (!currentQuery.trim()) {
            setError("Please enter a question.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResponse('');

        try {
            const result = await getFinancialInsights(financialData, currentQuery);
            if (result) {
                setResponse(result);
            } else {
                setError("The AI could not generate insights. Please try a different question.");
            }
        } catch (err) {
            setError("An error occurred while contacting the AI service. Please try again later.");
            console.error(err);
        } finally {
            setIsLoading(false);
            if (!prompt) {
                setQuery('');
            }
        }
    }, [query, financialData]);

    const handlePromptClick = (prompt: string) => {
        setQuery(prompt);
        handleGetInsights(prompt);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mt-8">
            <div className="flex items-center mb-4">
                 <svg className="w-8 h-8 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                <h3 className="text-xl font-semibold text-slate-800">AI Financial Assistant</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
                Ask questions about the financial data in the selected period to get instant summaries and insights.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
                {examplePrompts.map(prompt => (
                    <button 
                        key={prompt}
                        onClick={() => handlePromptClick(prompt)}
                        className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full hover:bg-slate-200 transition-colors"
                        disabled={isLoading}
                    >
                        {prompt}
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., How does our revenue compare to our costs?"
                    className="w-full border-slate-300 rounded-lg shadow-sm text-sm p-2 focus:ring-blue-500 focus:border-blue-500 flex-1 transition-colors"
                    rows={2}
                    disabled={isLoading}
                />
                <button
                    onClick={() => handleGetInsights()}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? 'Analyzing...' : 'Get Insights'}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            {isLoading && (
                 <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50 text-center">
                    <svg className="animate-spin h-6 w-6 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-sm text-slate-600 mt-2">AI is analyzing your data...</p>
                 </div>
            )}

            {response && (
                <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50 prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans bg-transparent p-0 text-slate-700">{response}</pre>
                </div>
            )}
        </div>
    )
}