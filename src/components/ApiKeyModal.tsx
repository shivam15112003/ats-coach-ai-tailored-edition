import { useState, useEffect } from "react";
import {
  KeyRound,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  ShieldCheck,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import {
  getStoredApiKey,
  setStoredApiKey,
  removeStoredApiKey,
  maskApiKey,
} from "../utils/apiKey";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [currentSavedKey, setCurrentSavedKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = getStoredApiKey();
      setCurrentSavedKey(saved);
      setApiKeyInput(saved);
      setShowKey(false);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: "Please enter a Gemini API key to test.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/verify-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": keyToTest,
        },
        body: JSON.stringify({ customApiKey: keyToTest }),
      });

      const data = await response.json();
      if (response.ok && data.valid) {
        setTestResult({
          success: true,
          message: data.message || "Key verified successfully! Ready to use.",
        });
      } else {
        setTestResult({
          success: false,
          message:
            data.error ||
            "Unable to verify this key. Please check for typos and quota status.",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Network error while connecting to verification service.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      handleRemove();
      return;
    }
    setStoredApiKey(trimmed);
    setCurrentSavedKey(trimmed);
    onClose();
  };

  const handleRemove = () => {
    removeStoredApiKey();
    setCurrentSavedKey("");
    setApiKeyInput("");
    setTestResult(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-[#FAF6EE] border border-[#E7DEC8] rounded-2xl shadow-xl overflow-hidden text-[#22302E] flex flex-col"
        role="dialog"
        aria-labelledby="api-key-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DEC8] bg-[#F4EEDF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E6A63] flex items-center justify-center text-white shadow-xs">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 id="api-key-modal-title" className="font-bold text-[#22302E] text-base leading-tight">
                Gemini API Key (Optional)
              </h3>
              <p className="text-[11px] text-[#22302E]/70">
                Fallback key when shared quota is exhausted or high traffic occurs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#22302E]/60 hover:text-[#22302E] hover:bg-[#EAE2CE] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs sm:text-sm">
          {/* Active status indicator if a key is stored */}
          {currentSavedKey ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-xs">Custom Key Active:</span>{" "}
                  <code className="text-xs font-mono bg-white/80 px-1.5 py-0.5 rounded border border-emerald-300">
                    {maskApiKey(currentSavedKey)}
                  </code>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs text-rose-700 hover:text-rose-900 flex items-center gap-1 font-medium hover:underline cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#EAE2CE]/60 border border-[#E7DEC8] text-[#22302E]/80 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#1E6A63] shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                By default, ATS Coach AI uses the built-in system service. If you encounter quota limits (<code className="font-mono text-[11px] bg-white/70 px-1 py-0.5 rounded">429 Resource Exhausted</code>) or high traffic, you can paste your personal Google Gemini API key below.
              </p>
            </div>
          )}

          {/* Key input */}
          <div className="space-y-1.5">
            <label
              htmlFor="gemini-key-input"
              className="block text-xs font-bold text-[#22302E] uppercase tracking-wider"
            >
              Your Google Gemini API Key
            </label>
            <div className="relative flex items-center">
              <input
                id="gemini-key-input"
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 pr-20 text-xs sm:text-sm font-mono bg-white border border-[#E7DEC8] rounded-xl text-[#22302E] focus:outline-none focus:ring-2 focus:ring-[#1E6A63] focus:border-transparent placeholder:text-[#22302E]/35"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-[#22302E]/60 hover:text-[#22302E] rounded hover:bg-[#FAF6EE] cursor-pointer"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Verification feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="leading-snug">{testResult.message}</p>
            </div>
          )}

          {/* Privacy & Link info */}
          <div className="space-y-2 pt-1 border-t border-[#E7DEC8]/80 text-[11px] text-[#22302E]/70 leading-relaxed">
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E6A63] shrink-0" />
              <span>
                <strong>Privacy Guaranteed:</strong> Your key is stored in your personal browser storage only and is never recorded in logs or persistent databases.
              </span>
            </p>
            <p className="flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-[#1E6A63] shrink-0" />
              <span>
                Don't have a key?{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1E6A63] underline font-semibold hover:text-[#17524C]"
                >
                  Generate a free Gemini API key at Google AI Studio
                </a>
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-[#E7DEC8] bg-[#FAF6EE]">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isTesting || !apiKeyInput.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1E6A63] bg-white border border-[#1E6A63]/30 rounded-xl hover:bg-[#1E6A63]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {isTesting ? "Testing Key..." : "Test Key"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#22302E]/70 hover:text-[#22302E] rounded-xl hover:bg-[#EAE2CE] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1E6A63] hover:bg-[#17524C] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {apiKeyInput.trim() ? "Save Key" : "Save Preferences"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
