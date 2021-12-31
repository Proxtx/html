export const build = (htmlObj) => {
  return loop(new Utility(htmlObj));
};

const loop = (utility) => {
  let result = [];
  while (utility.index < utility.htmlObj.length) {
    result.push(step(utility));
    try {
      utility.next();
    } catch (e) {
      break;
    }
  }
  return result;
};

const parsers = {
  html: (utility) => {
    if (utility.elem.type != "html") return;
    let node = document.createElement(utility.elem.tag);
    for (let i in utility.elem.attributes) {
      let attribute = utility.elem.attributes[i];
      node.setAttribute(attribute.attribute, genText(attribute.value));
    }
    if (!utility.elem.innerHTML) return node;
    let childNodes = build(utility.elem.innerHTML);
    for (let i in childNodes) node.appendChild(childNodes[i]);
    return node;
  },

  text: (utility) => {
    let htmlObj = [];
    utility.do((utility) => {
      if (utility.elem.type == "text") htmlObj.push(utility.elem);
      else return true;
    });
    if (!htmlObj.length) return;
    const node = document.createTextNode(genText(htmlObj));
    utility.next(-1);
    return node;
  },
};

const genText = (htmlObj) => {
  let text = "";
  for (let i in htmlObj) {
    text += htmlObj[i].char;
  }
  return text;
};

const step = (utility, ignore = []) => {
  let parserOrder = [parsers.html, parsers.text];
  for (let i in parserOrder) {
    if (ignore.includes(parserOrder[i])) continue;
    let result = parserOrder[i](utility);
    if (result || result === false) return result;
  }
};

class Utility {
  htmlObj;
  index = 0;
  elem;

  constructor(htmlObj) {
    this.htmlObj = htmlObj;
    this.elem = this.htmlObj[this.index];
  }

  next = (amount = 1) => {
    this.index += amount;
    if (this.index >= this.htmlObj.length)
      throw new Error(
        "Building Error. Something is trying to access an element over the limit."
      );
    return (this.elem = this.htmlObj[this.index]);
  };

  do = (job, first = false, last = false) => {
    first && this.next();
    while (!job(this)) {
      try {
        this.next();
      } catch (e) {
        last = false;
        break;
      }
    }
    last && this.next();
  };
}
