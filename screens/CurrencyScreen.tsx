

import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import Spinner from '../components/ui/Spinner';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';

interface Rates {
    [key: string]: number;
}

interface FrankfurterResponse {
    amount: number;
    base: string;
    date: string;
    rates: Rates;
}

const currencyNames: { [key: string]: string } = {
    USD: 'دولار أمريكي',
    EUR: 'يورو',
    TRY: 'ليرة تركية',
    AED: 'درهم إماراتي',
    SAR: 'ريال سعودي',
    CAD: 'دولار كندي',
    JPY: 'ين ياباني',
    GBP: 'جنيه استرليني',
    AUD: 'دولار أسترالي',
};

const localMarketRates = {
    'Damascus': {
        name: 'دمشق',
        'USD_SYP': { buy: 14850, sell: 14950 },
        'TRY_SYP': { buy: 455, sell: 465 },
    },
    'Aleppo': {
        name: 'حلب',
        'USD_SYP': { buy: 14820, sell: 14920 },
        'TRY_SYP': { buy: 452, sell: 462 },
    },
    'Raqqa': {
        name: 'الرقة',
        'USD_SYP': { buy: 14900, sell: 15000 },
        'TRY_SYP': { buy: 460, sell: 470 },
    },
    'Homs': {
        name: 'حمص',
        'USD_SYP': { buy: 14830, sell: 14930 },
        'TRY_SYP': { buy: 453, sell: 463 },
    },
    'Hama': {
        name: 'حماه',
        'USD_SYP': { buy: 14800, sell: 14900 },
        'TRY_SYP': { buy: 450, sell: 460 },
    },
    'Latakia': {
        name: 'اللاذقية',
        'USD_SYP': { buy: 14780, sell: 14880 },
        'TRY_SYP': { buy: 448, sell: 458 },
    },
    'Deir ez-Zor': {
        name: 'دير الزور',
        'USD_SYP': { buy: 14920, sell: 15020 },
        'TRY_SYP': { buy: 462, sell: 472 },
    },
    'Al-Hasakah': {
        name: 'الحسكة',
        'USD_SYP': { buy: 14950, sell: 15050 },
        'TRY_SYP': { buy: 465, sell: 475 },
    },
     'Idlib': {
        name: 'إدلب',
        'USD_SYP': { buy: 15000, sell: 15100 },
        'TRY_SYP': { buy: 470, sell: 480 },
    },
    'Daraa': {
        name: 'درعا',
        'USD_SYP': { buy: 14750, sell: 14850 },
        'TRY_SYP': { buy: 445, sell: 455 },
    },
};


type CityKey = keyof typeof localMarketRates;


const CurrencyScreen: React.FC = () => {
    const [ratesData, setRatesData] = useState<FrankfurterResponse | null>(null);
    const [baseCurrency, setBaseCurrency] = useState('USD');
    const [selectedCity, setSelectedCity] = useState<CityKey>('Damascus');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [analysis, setAnalysis] = useState('');
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);


    useEffect(() => {
        const fetchRates = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
                if (!response.ok) {
                    throw new Error('فشلت الشبكة في الاستجابة. يرجى المحاولة مرة أخرى.');
                }
                const data: FrankfurterResponse = await response.json();
                setRatesData(data);
            } catch (err: any) {
                console.error("Error fetching currency rates:", err);
                setError('لا يمكن تحميل أسعار الصرف. يرجى التحقق من اتصالك بالإنترنت.');
            } finally {
                setLoading(false);
            }
        };

        fetchRates();
    }, [baseCurrency]);

    const handleAnalysis = async () => {
        setAnalysisLoading(true);
        setAnalysis('');
        setAnalysisError(null);
        try {
            if (!process.env.API_KEY) {
              throw new Error("API key not configured.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const cityRates = localMarketRates[selectedCity];
            const prompt = `بناءً على أسعار الصرف التقريبية التالية في السوق المحلي بمدينة ${cityRates.name}: الدولار الأمريكي يبلغ حوالي ${cityRates.USD_SYP.sell} ليرة سورية، والليرة التركية حوالي ${cityRates.TRY_SYP.sell} ليرة سورية. قدم تحليلاً موجزاً جداً (3-4 جمل) حول وضع الليرة السورية وما يمكن توقعه في المدى القصير. يجب أن يكون التحليل عاماً وغير متخصص وموجهاً لعامة الناس.`;

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            
            setAnalysis(response.text);

        } catch (err: any) {
            console.error("Error generating analysis:", err);
            setAnalysisError('فشل في الحصول على تحليل. يرجى المحاولة مرة أخرى.');
        } finally {
            setAnalysisLoading(false);
        }
    };

    const targetCurrencies = useMemo(() => {
        return Object.keys(currencyNames).filter(c => c !== baseCurrency);
    }, [baseCurrency]);

    const currentCityRates = localMarketRates[selectedCity];

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        return (
            <div>
                {/* Local Market Section */}
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-bold text-cyan-400 mb-3">أسعار السوق المحلية (تقريبية)</h3>
                    <div className="mb-4">
                        <label className="block text-sm text-slate-400 mb-2">اختر المدينة:</label>
                        <Select value={selectedCity} onChange={e => setSelectedCity(e.target.value as CityKey)}>
                            {Object.keys(localMarketRates).map(cityKey => (
                                <option key={cityKey} value={cityKey}>{localMarketRates[cityKey as CityKey].name}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-md">
                            <div>
                                <p className="font-bold">دولار أمريكي مقابل ليرة سورية</p>
                                <p className="text-sm text-slate-400">USD / SYP</p>
                            </div>
                            <div className="text-left">
                                <p className="font-mono"><span className="text-xs text-slate-400">شراء: </span>{currentCityRates.USD_SYP.buy.toLocaleString()}</p>
                                <p className="font-mono"><span className="text-xs text-slate-400">مبيع: </span>{currentCityRates.USD_SYP.sell.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-md">
                            <div>
                                <p className="font-bold">ليرة تركية مقابل ليرة سورية</p>
                                <p className="text-sm text-slate-400">TRY / SYP</p>
                            </div>
                             <div className="text-left">
                                <p className="font-mono"><span className="text-xs text-slate-400">شراء: </span>{currentCityRates.TRY_SYP.buy.toLocaleString()}</p>
                                <p className="font-mono"><span className="text-xs text-slate-400">مبيع: </span>{currentCityRates.TRY_SYP.sell.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                     <p className="text-xs text-slate-500 mt-3 text-center">هذه الأسعار إرشادية وقد تختلف في السوق الفعلي.</p>
                </div>

                {/* AI Analysis Section */}
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-bold text-cyan-400 mb-3">تحليل الأسعار (تجريبي)</h3>
                    <Button onClick={handleAnalysis} loading={analysisLoading} className="w-full">
                        احصل على تحليل للوضع الحالي
                    </Button>
                    {analysisError && <p className="text-red-400 text-sm mt-4 text-center">{analysisError}</p>}
                    {analysis && !analysisLoading && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{analysis}</p>
                        </div>
                    )}
                </div>

                {/* International Rates Section */}
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-cyan-400 mb-3">الأسعار العالمية</h3>
                    <div className="mb-4">
                        <label className="block text-sm text-slate-400 mb-2">العملة الأساسية:</label>
                        <Select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)}>
                            {Object.keys(currencyNames).map(code => (
                                <option key={code} value={code}>{currencyNames[code]} ({code})</option>
                            ))}
                        </Select>
                    </div>
                     {ratesData && (
                        <p className="text-sm text-slate-400 mb-4 text-center">
                            آخر تحديث: {new Date(ratesData.date).toLocaleDateString('ar-EG')}
                        </p>
                    )}
                    <div className="space-y-2">
                        {ratesData && targetCurrencies.map(currency => (
                            ratesData.rates[currency] && (
                                <div key={currency} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-md">
                                    <div>
                                        <p className="font-bold">{currencyNames[currency]}</p>
                                        <p className="text-sm text-slate-400">{baseCurrency} / {currency}</p>
                                    </div>
                                    <p className="font-mono text-lg">{ratesData.rates[currency]?.toFixed(4)}</p>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16">
                        <h1 className="text-xl font-bold">أسعار صرف العملات</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default CurrencyScreen;