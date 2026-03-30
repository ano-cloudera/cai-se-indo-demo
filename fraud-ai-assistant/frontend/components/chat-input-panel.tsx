"use client";

interface ChatInputPanelProps {
  question: string;
  loading: boolean;
  starterPrompts: string[];
  onQuestionChange: (value: string) => void;
  onStarterSelect: (value: string) => void;
  onSubmit: () => void;
}

export function ChatInputPanel({
  question,
  loading,
  starterPrompts,
  onQuestionChange,
  onStarterSelect,
  onSubmit,
}: ChatInputPanelProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (!loading) {
      onSubmit();
    }
  }

  return (
    <section className="rounded-[30px] border border-white/70 bg-white/85 p-4 shadow-panel backdrop-blur">
      <div className="rounded-[26px] border border-[#f6d7af] bg-[#fffaf4] p-4">
        <textarea
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder="Ask about suspicious activity, fraud trends, risky customers, or explain a flagged transaction."
          className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#f2dfc5] pt-3">
          <div className="flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={loading}
                onClick={() => onStarterSelect(prompt)}
                className="rounded-full border border-[#f0d2af] bg-white px-3 py-2 text-xs font-medium text-[#9a5b13] transition hover:border-[#e8a757] hover:bg-[#fff2df] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onSubmit}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f97316] to-[#f59e0b] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(249,115,22,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Ask Assistant"}
            <span className="text-base">➜</span>
          </button>
        </div>
      </div>
    </section>
  );
}
