import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext";

type JourneyFrame = {
  keyword: string;
  keywordZh: string;
  idea: string;
  ideaZh: string;
  image: string;
  index: string;
};

const frames: JourneyFrame[] = [
  { index: "01", keyword: "DISCOVER", keywordZh: "发现", idea: "Begin with a medical or life-science domain, then locate the component families around it.", ideaZh: "从医学或生命科学领域开始，定位与研究问题相关的组件族。", image: "domains.jpg" },
  { index: "02", keyword: "COMPARE", keywordZh: "比较", idea: "Read the public context together: type, description, tags, license, and observed signals.", ideaZh: "并列查看类型、描述、标签、许可证与观测信号等公开信息。", image: "metadata.jpg" },
  { index: "03", keyword: "TRACE", keywordZh: "追溯", idea: "Follow each record back to its repository and inspect the source before reuse.", ideaZh: "沿着每条记录回到来源仓库，在复用前检查项目内容。", image: "sources.jpg" },
  { index: "04", keyword: "COMPOSE", keywordZh: "组合", idea: "Bring compatible components into a medical AI research workflow as the catalogue grows.", ideaZh: "随着目录扩展，将兼容组件组合进医疗 AI 研究工作流。", image: "market.jpg" },
];

export function ScrollJourney({ language }: { language: "en" | "zh" }) {
  const { preferences } = useWorkspace();
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const reduced = preferences.motion === "reduced" || (preferences.motion === "system" && systemReduced);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const imageBase = `${import.meta.env.BASE_URL}images/journey/`;
  const direction = useRef(1);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const move = (delta: number) => {
    setPaused(true);
    setStep(current => (current + delta + frames.length) % frames.length);
  };
  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setInterval(() => {
      if (step === frames.length - 1) direction.current = -1;
      if (step === 0) direction.current = 1;
      setStep(step + direction.current);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [paused, step, reduced]);

  return (
    <section className="journey" aria-labelledby="journey-title">
      <div className="journey-pin">
        <div className="journey-heading">
          <span className="eyebrow">{language === "en" ? "A MEDICAL RESEARCH PATH" : "医学研究路径"}</span>
          <h2 id="journey-title">{language === "en" ? "From a medical signal to a source." : "从医学信号走向可追溯来源。"}</h2>
          <p>{language === "en" ? "Explore the medical research path. Swipe or use the arrows to browse." : "探索医学研究路径。左右滑动或点击箭头浏览。"}</p>
        </div>
        <div className="journey-stage" tabIndex={0}
          aria-label={language === "en" ? "Medical research slides; use left and right arrow keys" : "医学研究轮播；使用左右方向键"}
          onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}
          onPointerDown={event => { gesture.current = { x: event.clientX, y: event.clientY }; }}
          onPointerCancel={() => { gesture.current = null; }}
          onPointerUp={event => {
            const start = gesture.current;
            gesture.current = null;
            if (!start) return;
            const dx = event.clientX - start.x;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(event.clientY - start.y)) move(dx < 0 ? 1 : -1);
          }}>
          <div className="journey-track" style={{ transform: `translateX(-${step * 100}%)` }}>
          {frames.map((frame, index) => {
            return (
              <article
                className={`journey-frame ${index === step ? "is-active" : ""}`}
                key={frame.keyword}
                style={{ backgroundImage: `url(${imageBase}${frame.image})` }}
                aria-hidden={index !== step}
              >
                <div className="journey-frame-scrim" />
                <div className="journey-copy">
                  <span>{frame.index} / {frames.length.toString().padStart(2, "0")}</span>
                  <h3>{language === "en" ? frame.keyword : frame.keywordZh}</h3>
                  <p>{language === "en" ? frame.idea : frame.ideaZh}</p>
                </div>
              </article>
            );
          })}
          </div>
        </div>
        <div className="journey-controls">
          <div className="journey-playback">
            <button onClick={() => move(-1)} aria-label={language === "en" ? "Previous slide" : "上一张"}>←</button>
            {!reduced && <button onClick={() => setPaused(!paused)}>{paused ? (language === "en" ? "Play" : "播放") : (language === "en" ? "Pause" : "暂停")}</button>}
            <button onClick={() => move(1)} aria-label={language === "en" ? "Next slide" : "下一张"}>→</button>
          </div>
          <div aria-label="Journey steps">
            {frames.map((frame, index) => (
                <button key={frame.keyword} type="button" className={index === step ? "is-active" : ""} onClick={() => { setPaused(true); setStep(index); }} aria-label={language === "en" ? `Show ${frame.keyword}` : `显示${frame.keywordZh}`} aria-pressed={index === step}>
                <i />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
