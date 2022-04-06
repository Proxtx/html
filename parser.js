export class Parser {
  /**
   * Parses html source code into arrays strings and objects (json)
   * @param {String} html html source code
   * @returns Parsed html code
   */
  parse = (html) => {
    return this.loop(new Utility(html));
  };

  loop = (utility) => {
    const resultArray = [];
    for (let i in utility.charArray) {
      let result = this.step(utility);
      if (result) resultArray.push((utility.prevElem = result));
      try {
        utility.next();
      } catch (e) {
        break;
      }
    }
    return resultArray;
  };

  regExpLib = {
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

  selfClosingTags = [
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

  parsers = {
    html: (utility) => {
      if (
        !utility.char.char.match(this.regExpLib.htmlStart) ||
        utility.char.escaped
      )
        return;
      let obj = { type: "html" };
      utility.prevElem = obj;
      utility.next();
      let tag = utility.char.getString().match(this.regExpLib.htmlTag)[0];
      tag = tag.substring(0, tag.length - 1);
      if (tag.match(this.regExpLib.htmlCommentStart)) {
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
        if (utility.char.char.match(this.regExpLib.htmlEnd)) return true;
        utility.next();
        const attribute = this.parseAttribute(utility);
        attribute && attributes.push(attribute);
      });
      obj.attributes = attributes;
      if (this.selfClosingTags.includes(tag.toLowerCase())) {
        obj.selfClosing = true;
        return obj;
      }
      utility.next();
      const innerHTML = [];
      utility.do((utility) => {
        if (
          utility.char.getString().match(this.regExpLib.htmlLoopEnd) &&
          !utility.char.escaped
        )
          return true;
        let result = this.step(utility);
        if (result) innerHTML.push((utility.prevElem = result));
        utility.next();
      });
      obj.innerHTML = innerHTML;
      utility.waitUntil(this.regExpLib.htmlLoopTagEnd);
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

  parseAttribute = (utility) => {
    if (!utility.char.char.match(this.regExpLib.attributeStart)) return;
    utility.prevElem = undefined;
    let attribute = utility.char
      .getString()
      .match(this.regExpLib.attributeType)[0];
    attribute = attribute.substring(0, attribute.length - 1);
    utility.next(attribute.length - 1);
    let obj = { attribute, value: "" };
    let noValue = false;
    utility.do((utility) => {
      utility.next();
      if (utility.char.char.match(this.regExpLib.attributeValueExist)) {
        noValue = true;
        return true;
      }
      if (utility.char.char.match(this.regExpLib.attributeValueEqual))
        return true;
      return false;
    });
    if (noValue) {
      utility.next(-1);
      return obj;
    }
    utility.waitUntil(this.regExpLib.attributeValueStart, true, true);
    let value = [];
    utility.do((utility) => {
      if (
        utility.char.char.match(this.regExpLib.attributeValueEnd) &&
        !utility.char.escaped
      )
        return true;
      let result = this.step(utility, [this.parsers.html]);
      if (result) {
        value.push(result);
        utility.prevElem = result;
      }
      utility.next();
    });
    utility.next();
    obj.value = value[0] ? value[0].text : "";
    utility.prevElem = undefined;
    return obj;
  };

  parserOrder = [this.parsers.html, this.parsers.text];

  step = (utility, ignore = []) => {
    for (let i in this.parserOrder) {
      if (ignore.includes(parserOrder[i])) continue;
      let result = this.parserOrder[i](utility);
      if (result || result === false) return result;
    }
  };
}

class Utility {
  charArray;
  char;
  index = 0;
  prevElem;

  constructor(string) {
    this.charArray = this.genCharArray(string);
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

  genCharArray = (string) => {
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
      let position = escapedString.length;
      charArray.push({
        char: stringSplit[i],
        escaped,
        position,
        getString: function () {
          return this.saveObj.string.substring(this.position);
        }.bind({ saveObj, position }),
      });
      escapedString += stringSplit[i];
      escaped = false;
    }
    saveObj.string = escapedString;
    return charArray;
  };
}

export const parserInstance = new Parser();

export const parserOrder = parserInstance.parserOrder;
export const parsers = parserInstance.parsers;
export const parse = parserInstance.parse;
