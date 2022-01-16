/**
 * Reverts the result of parse back to html code
 * @warn Escaping is not yet supported.
 * @param {Array} elementList The result of parse
 * @returns The result of parse as a String
 */
export const stringify = (elementList) => {
  let resultString = "";
  for (let i of elementList) {
    if (i.type == "text") {
      resultString += i.text;
    }
    if (i.type == "html") {
      resultString += `<${i.tag} `;
      for (let a of i.attributes) {
        resultString += `${a.attribute}="${a.value}" `;
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
