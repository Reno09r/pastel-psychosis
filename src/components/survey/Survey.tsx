import { useState, useEffect } from "react";
import { detectOS } from "@/lib/utils";

interface SurveyProps {
  onComplete: () => void;
}

export function Survey({ onComplete }: SurveyProps) {
  const [surveyPage, setSurveyPage] = useState(1);
  const [q3Answered, setQ3Answered] = useState(false);
  const [q4Text, setQ4Text] = useState("");

  // ---- Survey typewriter for Q4 ----
  useEffect(() => {
    if (surveyPage !== 4) return;
    const playerCity = "your city";
    const os = detectOS();
    const fullText = `Are you comfortable sitting in ${playerCity} right now behind your ${os} system? Look behind you.`;
    let i = 0;
    setQ4Text("");
    const interval = window.setInterval(() => {
      i++;
      setQ4Text(fullText.slice(0, i));
      if (i >= fullText.length) {
        window.clearInterval(interval);
        window.setTimeout(() => {
          onComplete();
        }, 2000);
      }
    }, 55);
    return () => window.clearInterval(interval);
  }, [surveyPage, onComplete]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-2xl rounded-xl border border-slate-300 bg-white p-8 shadow-2xl">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold text-slate-800">
            Alpha Test Evaluation Questionnaire
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Thank you for participating. Your feedback helps us improve our product.
          </p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Q1 */}
          {surveyPage === 1 && (
            <fieldset>
              <legend className="mb-2 font-medium text-slate-700">
                1. Rate the 3D physics responsiveness
              </legend>
              <div className="flex gap-4 text-sm text-slate-600">
                {["Excellent", "Stable", "Poor"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="q1"
                      value={opt}
                      onClick={() => setTimeout(() => setSurveyPage(2), 300)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Q2 */}
          {surveyPage === 2 && (
            <fieldset>
              <legend className="mb-2 font-medium text-slate-700">
                2. Which assets did you find most appealing?
              </legend>
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                {["Character Models", "3D Environments", "Lighting Effects"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input type="checkbox" name="q2" value={opt} />
                    {opt}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSurveyPage(3)}
                className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Next
              </button>
            </fieldset>
          )}

          {/* Q3 */}
          {surveyPage === 3 && (
            <fieldset>
              <legend className="mb-2 font-medium text-slate-700">
                3. Are you currently alone in the room?
              </legend>
              <div className="flex gap-4 text-sm text-slate-600">
                {["Yes", "No"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="q3"
                      value={opt}
                      onChange={() => {
                        setQ3Answered(true);
                        setTimeout(() => setSurveyPage(4), 500);
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Q4 */}
          {surveyPage === 4 && (
            <fieldset>
              <legend className="mb-2 font-medium text-slate-700">
                4. Additional comments
              </legend>
              <textarea
                readOnly
                value={q4Text}
                rows={4}
                className="w-full resize-none rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm text-slate-800"
                placeholder="Awaiting question..."
              />
            </fieldset>
          )}

          {surveyPage === 4 && (
            <button
              type="submit"
              disabled
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-60"
            >
              Submit Evaluation
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
