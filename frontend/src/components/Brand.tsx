import { Link } from "react-router-dom";
import { useUiLanguage } from "../state/useUiLanguage";

export function Brand() {
  const logoUrl = `${import.meta.env.BASE_URL}images/rsi-market-mascot.png`;
  const { zh } = useUiLanguage();
  const name = zh ? "组件市场" : "Component Market";

  return (
    <Link to="/" className="brand" aria-label={zh ? `RSI ${name}首页` : `RSI ${name} home`}>
      <img src={logoUrl} alt="" aria-hidden="true" />
      <span>
        <strong>RSI</strong> {name}
      </span>
    </Link>
  );
}
