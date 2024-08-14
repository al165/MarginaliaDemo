export const LIGHT_THEME = {
    name: "light",
    icons: "light",
    backgroundColor: "#FFFFFF",
    noteBgColor: "#E8E8E8",
    menuBgColor: "#E8E8E8",
    glowColor: "#C2C1FF",
    textColor: "#000000",
    iconFilter: "",
};

export const DARK_THEME = {
    name: "dark",
    icons: "magenta",
    backgroundColor: "#494949",
    noteBgColor: "#000000",
    menuBgColor: "#000000",
    glowColor: "#ff00ff",
    textColor: "#ffffff",
    iconFilter: "invert(100%)",
};

export const SUMMER_THEME = {
    name: "summer",
    icons: "yellow",
    backgroundColor: "#de3800",
    noteBgColor: "#ffd200",
    menuBgColor: "#ffd200",
    glowColor: "#ec8e6f",
    textColor: "#000000",
    iconFilter: "",
};

export const PURPLE_THEME = {
    name: "purple",
    icons: "magenta",
    backgroundColor: "#cabcfa",
    noteBgColor: "#cabcfa",
    menuBgColor: "#210000",
    glowColor: "#b26bfe",
    textColor: "#000000",
    iconFilter: "invert(100%)",
};

export const THEME_LIST = [
    LIGHT_THEME,
    DARK_THEME,
    SUMMER_THEME,
    PURPLE_THEME,
];

export function setTheme(colourTheme) {
    console.log(colourTheme['name']);

    document.documentElement.style.setProperty('--background-color', colourTheme.backgroundColor);
    document.documentElement.style.setProperty('--note-bg-color', colourTheme.noteBgColor);
    document.documentElement.style.setProperty('--menu-bg-color', colourTheme.menuBgColor);
    document.documentElement.style.setProperty('--glow-color', colourTheme.glowColor);
    document.documentElement.style.setProperty('--text-color', colourTheme.textColor);

    for (const toolIcon of document.querySelectorAll(".tool")) {
        toolIcon.style.filter = colourTheme.iconFilter;
    }
    for (const logo of document.querySelectorAll(".logo-text")) {
        logo.style.filter = colourTheme.iconFilter;
    }
}
