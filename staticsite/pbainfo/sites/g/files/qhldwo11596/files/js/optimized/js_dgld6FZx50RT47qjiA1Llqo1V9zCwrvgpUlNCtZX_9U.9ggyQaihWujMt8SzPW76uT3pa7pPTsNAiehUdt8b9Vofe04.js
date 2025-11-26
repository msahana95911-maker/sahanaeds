
(function (Drupal, drupalSettings, OtsukaFM) {
  'use strict'

  Drupal.behaviors.focusTrap = {
    attach: (context) => {
      const selectors = drupalSettings.otsuka_focus_manager.selectors
      selectors.forEach((selector) => {
        if (!OtsukaFM.selectors.includes(selector)) {
          OtsukaFM.waitForElement(selector);
        }
      })
    },
  };
})(Drupal, drupalSettings, OtsukaFM);
