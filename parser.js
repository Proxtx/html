const genCharArray = (string) => {
  let saveObj = {};
  let escapedString = "";
  let stringSplit = string.split("");
  let charArray = [];
  let escaped = false;
  for (let i in stringSplit) {
    if (stringSplit[i] == "\\" && !escaped) {
      escaped = true;
      continue;
    }
    let obj;
    let position = escapedString.length;
    charArray.push(
      (obj = {
        char: stringSplit[i],
        escaped,
        position,
        getString: function () {
          return this.saveObj.string.substring(this.position);
        }.bind({ saveObj, position }),
      })
    );
    escapedString += stringSplit[i];
    escaped = false;
  }
  saveObj.string = escapedString;
  return charArray;
};

export const parse = (html) => {
  return loop(new Utility(html));
};

const loop = (utility) => {
  const resultArray = [];
  for (let i in utility.charArray) {
    let result = step(utility);
    if (result) resultArray.push((utility.prevElem = result));
    try {
      utility.next();
    } catch (e) {
      break;
    }
  }
  return resultArray;
};

const regExpLib = {
  htmlTag: /.*?(>|\s)/,
  htmlStart: /</,
  htmlEnd: />/,
  attributeStart: /\w/,
  attributeType: /.*?(\=|\s|\>)/,
  attributeValueStart: /\"/,
  attributeValueEnd: /\"/,
  attributeValueExist: /((?=\S)|(?=\>))(?=[^\=])/,
  attributeValueEqual: /\=/,
  htmlLoopEnd: /^<\//,
  htmlLoopTagEnd: />/,
  htmlCommentStart: /^!--/,
  htmlCommentEnd: /^-->/,
};

const selfClosingTags = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
  "command",
  "keygen",
  "menuitem",
  "!doctype",
];

const parsers = {
  html: (utility) => {
    if (!utility.char.char.match(regExpLib.htmlStart) || utility.char.escaped)
      return;
    let obj = { type: "html" };
    utility.prevElem = obj;
    utility.next();
    let tag = utility.char.getString().match(regExpLib.htmlTag)[0];
    tag = tag.substring(0, tag.length - 1);
    if (tag.match(regExpLib.htmlCommentStart)) {
      utility.do((utility) => {
        let find = utility.char.getString().match(regExpLib.htmlCommentEnd);
        if (!find) {
          utility.next();
          return;
        }
        utility.next(find[0].length - 1);
        return true;
      });
      return false;
    }
    utility.next(tag.length);
    obj.tag = tag;
    let attributes = [];
    utility.do((utility) => {
      if (utility.char.char.match(regExpLib.htmlEnd)) return true;
      utility.next();
      const attribute = parseAttribute(utility);
      attribute && attributes.push(attribute);
    });
    obj.attributes = attributes;
    if (selfClosingTags.includes(tag.toLowerCase())) {
      return obj;
    }
    utility.next();
    const innerHTML = [];
    utility.do((utility) => {
      if (
        utility.char.getString().match(regExpLib.htmlLoopEnd) &&
        !utility.char.escaped
      )
        return true;
      let result = step(utility);
      if (result) innerHTML.push((utility.prevElem = result));
      utility.next();
    });
    obj.innerHTML = innerHTML;
    utility.waitUntil(regExpLib.htmlLoopTagEnd);
    return obj;
  },
  text: (utility) => {
    if (utility.prevElem && utility.prevElem.type == "text") {
      utility.prevElem.text += utility.char.char;
    } else {
      return { type: "text", text: utility.char.char };
    }
  },
};

const parseAttribute = (utility) => {
  if (!utility.char.char.match(regExpLib.attributeStart)) return;
  utility.prevElem = undefined;
  let attribute = utility.char.getString().match(regExpLib.attributeType)[0];
  attribute = attribute.substring(0, attribute.length - 1);
  utility.next(attribute.length - 1);
  let obj = { attribute, value: "" };
  let noValue = false;
  utility.do((utility) => {
    utility.next();
    if (utility.char.char.match(regExpLib.attributeValueExist)) {
      noValue = true;
      return true;
    }
    if (utility.char.char.match(regExpLib.attributeValueEqual)) return true;
    return false;
  });
  if (noValue) {
    utility.next(-1);
    return obj;
  }
  utility.waitUntil(regExpLib.attributeValueStart, true, true);
  let value = [];
  utility.do((utility) => {
    if (utility.char.char.match(regExpLib.attributeValueEnd)) return true;
    let result = step(utility, [parsers.html]);
    if (result) {
      value.push(result);
      utility.prevElem = result;
    }
    utility.next();
  });
  utility.next();
  obj.value = value;
  utility.prevElem = undefined;
  return obj;
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
  charArray;
  char;
  index = 0;
  prevElem;

  constructor(string) {
    this.charArray = genCharArray(string);
    this.char = this.charArray[this.index];
  }

  next = (amount = 1) => {
    this.index += amount;
    if (this.index >= this.charArray.length)
      throw new Error(
        "Parsing Error. Something is trying to access a character over the limit."
      );
    return (this.char = this.charArray[this.index]);
  };

  waitUntil = (match, first = false, last = false) => {
    first && this.next();
    while (!this.char.char.match(match)) this.next();
    last && this.next();
    return this.char;
  };

  do = (job, first = false, last = false) => {
    first && this.next();
    while (!job(this)) {}
    last && this.next();
  };
}
