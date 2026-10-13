"""Create a reduced-motion SVG that preserves the snake's initial state."""

from pathlib import Path
import re
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)


def without_animation(css):
    """Remove generated keyframes and animation declarations, retaining base CSS."""
    while True:
        match = re.search(r"@(?:-webkit-)?keyframes\s+[^\{]+\{", css, re.IGNORECASE)
        if match is None:
            break
        depth = 1
        cursor = match.end()
        while cursor < len(css) and depth:
            depth += (css[cursor] == "{") - (css[cursor] == "}")
            cursor += 1
        css = css[:match.start()] + css[cursor:]
    return re.sub(
        r"(?<![\w-])(?:-webkit-)?animation(?:-[\w-]+)?\s*:[^;}]*;?",
        "",
        css,
        flags=re.IGNORECASE,
    )


def main():
    source = ROOT / "assets" / "readme" / "snake.svg"
    target = source.with_name("snake-static.svg")
    tree = ET.parse(source)
    root = tree.getroot()
    titles = [child for child in root if child.tag.rsplit("}", 1)[-1] == "title"]
    title = titles[0] if titles else ET.Element(f"{{{SVG_NS}}}title")
    if not titles:
        root.insert(0, title)
    title.text = "Static contribution snake — ctrl-pt"
    for node in root.iter():
        if node.tag.rsplit("}", 1)[-1] == "style":
            node.text = without_animation(node.text or "")
        if "style" in node.attrib:
            node.attrib["style"] = without_animation(node.attrib["style"])
    tree.write(target, encoding="utf-8", xml_declaration=True)
    print("Created assets/readme/snake-static.svg.")


if __name__ == "__main__":
    main()
