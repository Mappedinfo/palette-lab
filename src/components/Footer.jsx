import GithubIcon from './GithubIcon';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p>
          © {new Date().getFullYear()} Palette Lab · Mappedinfo 开源配色档案 · 基于 15 色学术配色
        </p>
        <a href="https://github.com/Mappedinfo/palette-lab" target="_blank" rel="noreferrer">
          <GithubIcon size={15} /> Mappedinfo / palette-lab
        </a>
      </div>
    </footer>
  );
}
