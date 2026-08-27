// components/theme/ThemeScript.tsx
//
// Applies the saved/system theme to <html> BEFORE first paint so the dark
// theme never flashes white on load. Runs as a blocking inline script —
// this is the one place a raw <script> is warranted (branding §9).

const script = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
