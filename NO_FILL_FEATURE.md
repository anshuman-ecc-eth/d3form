# No Fill & Default Styles Update

## Usage
- **No Fill Checkbox**: A new "None" checkbox has been added next to the Fill label.
  - **Checked**: The object body becomes transparent (wireframe style).
  - **Unchecked**: The object uses the selected fill color.
- **Auto-Switching**: Picking a color from the picker automatically unchecks "None". Checking "None" overrides the color.

## Defaults Updated
- **Fill**: Defaults to **None** (Transparent).
- **Stroke**: Defaults to **White** (`#ffffff`).
- **Stroke Width**: Defaults to **2px**.

This allows you to immediately draw hollow shapes suitable for diagrams, without needing to manually adjust properties every time.

## How to Test
1. **Refresh** (F5).
2. **Draw a Rectangle**: It should appear as a white outline with no background.
3. **Select it**: Notice the properties panel shows "None" checked.
4. **Uncheck "None"**: It fills with the default purple (or current picker color).
5. **Draw a Circle**: It also starts transparent.
6. **Change Color**: Pick a red color. "None" unchecks automatically.
