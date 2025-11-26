(($, Drupal, drupalSettings, once) => {

  'use strict';

  Drupal.analytics = Drupal?.analytics ?? {};

  let externalLink = '';
  const dataAnalyticsLinkClass = 'add-data-analytics-link';
  const analyticsTagsProcessedClass = 'analytic-tags-processed';

  const AnalyticsParser = {
    /**
     * Discover element position on the page.
     *
     * @param {Element} el element on the website DOM
     * @returns {String}
     */
    getPosition(el) {
      const elPosition = el.closest('[data-analytics-position]');
      const parentTag = el.parentElement
        ?.closest('footer, header, body')
        ?.tagName
        ?.toLowerCase();
      return elPosition
        ? elPosition.getAttribute('data-analytics-position')
        : parentTag;
    },

    /**
     * Discover element position on the page.
     *
     * @param {Element} el element on the website DOM
     * @returns {String}
     */
    getElementPath(el) {
      const elName = [];
      let elPosition = el.closest('[data-analytics-group]');
      while (elPosition != null) {
        const group = elPosition.getAttribute('data-analytics-group')
        // Include active tab name in the path
        if (group.includes('Tabs')) {
          const activeTab = elPosition.querySelector('.nav-link.active');
          if (
            activeTab
            && activeTab.hasAttribute('data-analytics-name')
            && !elName.includes(activeTab.getAttribute('data-analytics-name'))
          ) {
            elName.unshift(activeTab.getAttribute('data-analytics-name'));
          }
        }
        elName.unshift(group);
        elPosition = elPosition.parentElement.closest('[data-analytics-group]');
      }
      if (elName.length === 0) {
        const position = el.parentElement
          ?.closest('footer, header, body')
          ?.tagName
          ?.toLowerCase();
        if (position) {
          elName.push(position)
        }
      }
      return elName.join(' > ');
    },

    /**
     * Fetch element name.
     *
     * @param {Element} el element on the website DOM
     * @returns {String}
     */
    getElementName(el) {
      if (el.getAttribute('data-analytics-name')) {
        return el.getAttribute('data-analytics-name');
      } else if (el.innerText !== '' && el.innerText !== null && typeof el.innerText !== 'undefined') {
        const cleanEl = el.cloneNode(true);
        const icons = cleanEl.querySelectorAll('svg, img');
        if (icons && icons.length > 0) {
          cleanEl.querySelectorAll('svg, img').forEach((child) => child.remove());
        }
        return cleanEl.innerText.replace(/["'`\n\r\t\0\v]/g, '').trim();
      } else {
        return 'link';
      }
    },

    /**
     * Process href from link.
     *
     * @param {Element} el element on the website DOM
     * @returns {String}
     */
    getElementLink(el) {
      if (el.tagName === 'button') {
        return 'n/a';
      }

      try {
        const href = el.getAttribute('href');
        const url = new URL(href, window.location.origin);

        if (
          href.startsWith('#') ||
          href.startsWith('?')
        ) {
          if (href.length === 1) {
            return 'n/a';
          }
          url.pathname = window.location.pathname;
        }
        return url.toString();
      } catch (error) {
        return 'n/a';
      }
    },

    /**
     * Process href from link.
     *
     * @param {Element} el element on the website DOM
     * @param {String} href overrides for elements that do not initially have href
     * @returns {String}
     */
    getFilename(el, href) {
      if (el.getAttribute('data-analytics-filename')) {
        return el.getAttribute('data-analytics-filename');
      }

      try {
        const url = new URL(href || el.getAttribute('href'), window.location.origin);
        // Exit for link tel and mailto.
        if (!url.protocol.includes('http')) return;
        const filename = url.pathname.split('/').pop();
        const filterExt = ['php', 'html', 'htm', 'js', 'css', 'aspx', 'asp'];
        return (filename.includes('.') && !filterExt.includes(filename.split('.').pop())) ? filename : false;
      } catch (error) {
        return 'n/a';
      }
    },

    /**
     * Process href from link.
     *
     * @param {Element} el element on the website DOM
     * @returns {String}
     */
    getIsExitModal(el) {
      try {
        const url = new URL(el.getAttribute('href'), window.location.origin);
        // Exit for link tel and mailto.
        if (!url.protocol.includes('http')) return 'n/a'
        if (url.host !== window.location.host) {
          return !el.classList.contains('external-link-popup-disabled');
        }
        return 'n/a'
      } catch (error) {
        return 'n/a';
      }
    },

    /**
     * Setup event listeners.
     *
     * @returns {void}
     */
    setAnalyticsTag(el, parameters = {}) {
      const filename = parameters?.filename ?? AnalyticsParser.getFilename(el);
      const analytics = {
        'name': parameters?.name ?? AnalyticsParser.getElementName(el),
        'position': parameters?.position ?? AnalyticsParser.getPosition(el),
        'group': parameters?.group ?? AnalyticsParser.getElementPath(el),
        'href': parameters?.href ?? AnalyticsParser.getElementLink(el),
      };
      if (filename) {
        analytics.filename = filename;
      }
      const exitmodal = parameters?.exitmodal ?? AnalyticsParser.getIsExitModal(el);
      if (exitmodal !== 'n/a') {
        analytics.exitmodal = exitmodal;
        if (exitmodal) {
          el.addEventListener('click', () => {
            externalLink = analytics.href;
          });
        }
      }
      return analytics;
    },

    /**
     * DOM structure change listener for any new elements that could appears as
     * part of JS processing.
     *
     * @param {string} selector
     * @returns
     */
    waitForUpdates(selector) {
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes') {
            const node = mutation.target;
            const attr = mutation.attributeName;
            if (
              (node.matches('a') && attr === 'href') ||
              attr === 'data-analytics-name' ||
              node.classList.contains(dataAnalyticsLinkClass)
            ) {
              Drupal.analytics.addDataAnalyticsLink(node);
            }
            if (node.classList.contains(dataAnalyticsLinkClass)) {
              node.classList.remove(dataAnalyticsLinkClass);
            }
          } else if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && node.matches(selector)) {
                Drupal.analytics.addDataAnalyticsLink(node);
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
    },
  };

  /**
   * Adds or updates the `data-analytics-link` attribute on a DOM element.
   *
   * @namespace Drupal
   * @function addDataAnalyticsLink
   * @param {HTMLElement} element - The DOM element to which the
   *   `data-analytics-link` attribute should be added or updated.
   * @param {Object.<string, any>} [parameters={}] - An optional object
   *   containing key-value pairs to merge into the `data-analytics-link`
   *   JSON attribute.
   *
   * Available parameters:
   * @param {string} [parameters.name] - The name of the element for analytics tracking.
   * @param {string} [parameters.position] - The position of the element within the DOM for analytics tracking.
   * @param {string} [parameters.group] - The group or hierarchy path of the element within the DOM.
   * @param {string} [parameters.href] - The URL or link associated with the element.
   * @param {string} [parameters.filename] - The filename associated with the element (if applicable).
   * @param {string} [parameters.exitmodal] - Indicates whether the element triggers an "exit modal".
   *
   * @returns {void}
   */
  Drupal.analytics.addDataAnalyticsLink = (element, parameters = {}) => {
    const analytics = AnalyticsParser.setAnalyticsTag(element, parameters);
    element.setAttribute('data-analytics-link', JSON.stringify(analytics));
    element.classList.add(analyticsTagsProcessedClass);
  }

  Drupal.behaviors.addLinksAnalytics = {
    attach: function (context) {
      const linkSelector = `a[href]:not([data-analytics-link]), button:not([data-analytics-link]), .${dataAnalyticsLinkClass}`;
      once('analytic-tags-processed', linkSelector).forEach(function (link) {
        const analytics = AnalyticsParser.setAnalyticsTag(link);
        link.setAttribute('data-analytics-link', JSON.stringify(analytics));
      });
      AnalyticsParser.waitForUpdates(linkSelector);
      document.addEventListener('dialog:aftercreate', (e) => {
        const dialog = e.target.closest('[role="dialog"]');
        once('analytic-tags-processed', linkSelector, dialog).forEach(function (link) {
          const analytics = AnalyticsParser.setAnalyticsTag(link);
          analytics.group = 'modal';
          const acceptButtons = e.settings?.buttons?.filter(button => {
            if (button.text === analytics?.name) {
              const labelYesButton = drupalSettings?.external_link_popup.popups?.filter(popup => popup?.labelyes === button.text);
              return labelYesButton?.length > 0;
            }
            return false;
          });
          if (externalLink.length > 0 && acceptButtons?.length > 0) {
            analytics.href = externalLink;

            const filename = AnalyticsParser.getFilename(link, externalLink);
            if (filename && filename !== 'n/a') {
              analytics.filename = filename;
            }
          }
          link.setAttribute('data-analytics-link', JSON.stringify(analytics));
        });
        externalLink = '';
      });

      // Add data-analytics-link attribute to all inputs (checkbox, radio).
      $(once('analytic-tags-processed', 'input[type=checkbox], input[type=radio]', context)).each(function () {
        const $element = $(this);
        const name = $element.parent().find('label').text().replace(/["'`\n\r\t\0\v]/g, '').trim();
        
        Drupal.analytics.addDataAnalyticsLink(this, {
          name: name ?? $element.attr('type'),
        });
        $(this).addClass('data-analytics-click-link');
      });
    }
  };

})(jQuery, Drupal, drupalSettings, once);
