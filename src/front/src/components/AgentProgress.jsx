import scraperImg from "../assets/characters/scraper.png";
import synthesizerImg from "../assets/characters/synthesizer.png";
import writerImg from "../assets/characters/writer.webp";

const STATIONS = [
  {
    id: "scout",
    name: "Web Scraper",
    role: "Intake & Signal",
    img: scraperImg,
    match: /fetching job|extracting company|scraping company|hunter\.io/i,
    idle: "Waiting to parse the posting and scrape company signal.",
    activeAnim: "animate-[scan-sway_1.1s_ease-in-out_infinite]",
    workIcon: "travel_explore",
    workIconAnim: "animate-[sweep-x_1.4s_ease-in-out_infinite]",
  },
  {
    id: "synth",
    name: "Synthesizer",
    role: "Research & Match",
    img: synthesizerImg,
    match: /researching public signals|summarizing talking points/i,
    idle: "Waiting on scraped signal before cross-referencing your resume.",
    activeAnim: "animate-[think-pulse_1.3s_ease-in-out_infinite]",
    workIcon: "psychology",
    workIconAnim: "animate-pulse",
  },
  {
    id: "writer",
    name: "Outreach Writer",
    role: "Drafting",
    img: writerImg,
    match: /writing email/i,
    idle: "Waiting on research before drafting each intro.",
    activeAnim: "animate-[write-bob_0.6s_ease-in-out_infinite]",
    workIcon: "edit_note",
    workIconAnim: "animate-pulse",
  },
];

export default function AgentProgress({ messages, warnings = [] }) {
  const lastMessage = messages[messages.length - 1] || "";
  const activeIndex = STATIONS.findIndex((s) => s.match.test(lastMessage));

  return (
    <div className="flex flex-col gap-8">
      {/* Browser-simulation panel */}
      <div className="relative w-full bg-surface-container-lowest border-2 border-ink shadow-brutal overflow-hidden">
        <div className="w-full bg-surface-container-high px-4 py-3 flex items-center justify-between gap-4 border-b-2 border-ink">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red" />
            <div className="w-3 h-3 rounded-full bg-yellow" />
            <div className="w-3 h-3 rounded-full bg-blue" />
            <span className="ml-3 text-xs font-headline font-bold text-ink/60 tracking-wide uppercase">
              OutreachAI // Agent Session
            </span>
          </div>
          <span className="text-[10px] font-headline font-bold px-2 py-0.5 bg-yellow text-ink uppercase border border-ink">
            {messages.length === 0 ? "Initializing" : "Running"}
          </span>
        </div>

        {/* Character stage — real pixel-art crew, animated per their role's task */}
        <div className="p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATIONS.map((station, i) => {
            const isActive = i === activeIndex;
            const isDone = activeIndex !== -1 && i < activeIndex;
            const caption = isActive ? lastMessage : isDone ? "Done" : station.idle;
            return (
              <div
                key={station.id}
                className={`flex flex-col items-center text-center gap-2 p-4 border-2 transition-all ${
                  isActive ? "bg-white border-ink shadow-brutal-sm" : "bg-surface-container-low border-ink/20"
                }`}
              >
                <div className="flex items-center justify-between w-full text-[10px] font-headline font-bold uppercase text-ink/50">
                  <span>{station.role}</span>
                  {isDone && <span className="material-symbols-outlined text-[14px] text-blue" aria-hidden="true">check_circle</span>}
                  {isActive && (
                    <span className={`material-symbols-outlined text-[14px] text-red ${station.workIconAnim}`} aria-hidden="true">
                      {station.workIcon}
                    </span>
                  )}
                </div>

                <div className="relative w-20 h-20 flex items-center justify-center">
                  <img
                    src={station.img}
                    alt=""
                    aria-hidden="true"
                    className={`w-full h-full object-contain [image-rendering:pixelated] transition-all duration-300 ${
                      isActive ? station.activeAnim : isDone ? "opacity-100" : "opacity-40 grayscale"
                    }`}
                  />
                </div>

                <div className="w-full">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-ink block">
                    {station.name}
                  </span>
                  <p className="text-[11px] text-ink/60 font-body leading-snug mt-1 min-h-[2.5em]">{caption}</p>
                </div>
              </div>
            );
          })}
        </div>

        {warnings.length > 0 && (
          <div className="px-5 sm:px-8 pb-5 sm:pb-8 space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="bg-yellow/20 border-2 border-ink text-ink text-xs font-medium px-3 py-2.5 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">warning</span>
                {w}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
