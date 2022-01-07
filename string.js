export const stringify = (htmlObj) => {
  let resultString = "";
  for (let i of htmlObj) {
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
