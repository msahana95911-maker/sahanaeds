const OtsukaFM = Object.create({

  stack: [],
  cache: [],
  selectors: [],

  createFocusTrap: function (selector, options = {
    trapStack: this.stack,
    initialFocus: false,
    allowOutsideClick: true,
    escapeDeactivates: true,
    preventScroll: true,
    clickOutsideDeactivates: true,
  }) {
    let trap = focusTrap.createFocusTrap(selector, options);

    trap.selector = selector;
    return trap;
  },

  addFocusTrap: function (selector) {
    let focusTrap = this.getFocusTrap(selector);
    if (!focusTrap) {
      focusTrap = this.createFocusTrap(selector);
    }
    return focusTrap;
  },

  getFocusTrap: function (selector = false) {
    if (selector) {
      return this.stack.find(e => e.selector === selector) ? this.stack.find(e => e.selector === selector) : false;
    }
    return this.stack[this.stack.length - 1] ? this.stack[this.stack.length - 1] : false;
  },

  deleteFocusTrap: function (selector = false) {
    if (selector) {
      this.stack = this.stack.filter(e => e.selector !== selector);
    } else {
      let last = this.stack.pop();
      return last ? last : false;
    }
  },

  activateFocusTrap: function (focusTrapObj) {
    try {
      focusTrapObj.activate();
    } catch (e) {
      // throw e
    }
  },

  deactivateFocusTrap: function (focusTrapObj) {
    try {
      focusTrapObj.deactivate();
    } catch (e) {
      // throw e
    }
  },

  trapFocus: function (selector) {
    let trap = this.addFocusTrap(selector);
    if (trap) {
      this.activateFocusTrap(trap);
    }
  },

  releaseFocus: function (selector) {
    let trap = this.getFocusTrap(selector);
    if (trap) {
      this.deactivateFocusTrap(trap);
      this.deleteFocusTrap(selector);
    }
    trap = this.getFocusTrap();
    if (trap) {
      this.activateFocusTrap(trap);
    }
  },

  cacheFocus: function () {
    if (this.cache.length) {
      return;
    }
    this.cache = [];
    this.stack.forEach((element) => {
      this.cache.push(element.selector);
    });
    this.cache.forEach((element) => {
      this.releaseFocus(element);
    });
  },

  restoreFocus: function () {
    this.cache.forEach((element) => {
      this.trapFocus(element);
    });
    this.cache = [];
  },

  waitForElement: function waitForElm(selector) {
    OtsukaFM.selectors.push(selector);
    return new Promise(function (resolve) {
      const initNode = document.querySelector(selector)
      if (initNode && initNode.checkVisibility()) {
        OtsukaFM.trapFocus(selector);
      }

      const observer = new MutationObserver(function (mutations) {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes') {
            if (mutation.target.matches(selector)) {
              if (mutation.target.checkVisibility()) {
                OtsukaFM.trapFocus(selector);
              } else {
                OtsukaFM.releaseFocus(selector);
              }
            }
          } else if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && node.matches(selector)) {
                OtsukaFM.trapFocus(selector);
              }
            })
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === 1 && node.matches(selector)) {
                OtsukaFM.releaseFocus(selector);
              }
            })
          }
        })
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    });
  },

  cacheFocusOnElem: function (selector) {
    return new Promise(function (resolve) {
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes') {
            if (mutation.target.matches(selector)) {
              if (mutation.target.checkVisibility()) {
                OtsukaFM.cacheFocus();
              } else {
                OtsukaFM.restoreFocus();
              }
            }
          } else if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && node.matches(selector)) {
                OtsukaFM.cacheFocus();
              }
            })
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === 1 && node.matches(selector)) {
                OtsukaFM.restoreFocus();
              }
            })
          }
        })
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    });
  },
});
