/**
 * Reverts the result of parse back to html code
 * @param {Array} elementList The result of parse
 * @returns The result of parse as a String
 */
export const stringify = (elementList) => {
  let resultString = "";
  for (let i of elementList) {
    if (i.type == "text") {
      resultString += i.text.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    }
    if (i.type == "html") {
      resultString += `<${i.tag} `;
      for (let a of i.attributes) {
        resultString += `${a.attribute}="${a.value.replaceAll(
          '"',
          "&quot;"
        )}" `;
      }
      resultString += ">";
      if (i.innerHTML && i.innerHTML.length > 0) {
        resultString += stringify(i.innerHTML);
      }
      if (!i.selfClosing) {
        resultString += `</${i.tag}>`;
      }
    }
  }
  return resultString;
};
