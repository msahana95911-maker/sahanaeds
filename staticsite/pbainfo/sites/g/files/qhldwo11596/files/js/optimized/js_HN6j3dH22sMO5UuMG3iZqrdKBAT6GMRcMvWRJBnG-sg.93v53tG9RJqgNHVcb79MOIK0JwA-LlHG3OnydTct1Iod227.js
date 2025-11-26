/*
 * @file: otsuka_sfmc_preprocess.js
 * @description: clientside javascript for parsing out query string values and storing to local storage, preprocess SFMC webform
 */

(function ($, Drupal) {
  'use strict';

  /**
   * This Drupal Behavior automatically hides required or preset SFMC object
   * fields from the webform to prevent users from changing the values.
   **/
  Drupal.behaviors.OtsukaSfmcRegistrationPreprocess = {
    attach: function (context, settings) {
      if ($('body').find('.hidden-sfmc-value').length > 0) {
        $('.hidden-sfmc-value').each(function () {
          $(this).parent('.form-item').addClass('sfmc-conceal');
        });
      }
    }
  };

  Drupal.behaviors.OtsukaSfmcRegistrationStorage = {
    attach: function (context, settings) {
      if (settings.otsuka_sfmc_registration) {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        // Set local storage values
        Object.keys(settings.otsuka_sfmc_registration).forEach(function (key) {
          var param = urlParams.get(key);

          if (param !== null) {
            window.localStorage.setItem(settings.otsuka_sfmc_registration[key], param);
          }
        });

        // Update input values
        Object.keys(settings.otsuka_sfmc_registration).forEach(function (key) {
          var value = window.localStorage.getItem(settings.otsuka_sfmc_registration[key]);

          if (value !== null) {
            $('input[name="' + settings.otsuka_sfmc_registration[key] + '"]', context).val(value);
          }
        });
      }
    }
  };

})(jQuery, Drupal);
