(($, Drupal) => {
  Drupal.behaviors.analyticsFormLSConfirmation = {
    attach: (context) => {
      Drupal.analytics = Drupal?.analytics ?? {};

      Drupal.analytics.lsNewPageConfirmation = {
        /**
         * Init Form Confirmation using Local Storage key 
         * if the Form Confirmation Message on new page and with no form.
         *
         * @param {Element} form
         * @param {Object} options
         */
        init(form, options) {
          if (options?.newPageConfirmationSettings?.lsKey) {
            const path = window.location.pathname;
            const lsKey = options.newPageConfirmationSettings.lsKey;
            const formPaths = options?.newPageConfirmationSettings?.formPaths;
            const $form = $(form);
            const $submitButton = $form.find(options?.submitButtonSelector ?? 'input[type="submit"]');

            if (formPaths?.includes(path)) {
              if (options?.ajax) {
                $submitButton.on('click', () => {
                  localStorage.setItem(lsKey, '1');
                });
              } else {
                $form.on('submit', () => {
                  localStorage.setItem(lsKey, '1');
                });
              }
            }
          }
        },

        /**
         * Check if form completed using Local Storage and Confirmation path
         * if there are no form on Confirmation page.
         *
         * @param {Object} options
         */
        check(options) {
          if (options?.newPageConfirmation && options?.newPageConfirmationSettings?.lsKey) {
            const path = window.location.pathname;
            const lsKey = options.newPageConfirmationSettings.lsKey;
            const confirmationPaths = options?.newPageConfirmationSettings?.confirmationPaths;

            if (confirmationPaths?.includes(path) && localStorage.getItem(lsKey)) {
              window.onload = () => {
                $(document).trigger('form_complete', {
                  form_name: options?.formName,
                  form_type: options?.formType,
                });
              }
              localStorage.removeItem(lsKey);
            }
          }
        },

        /**
         * Delete Local Storage key.
         *
         * @param {Object} options
         */
        deleteKey(options) {
          const lsKey = options?.newPageConfirmationSettings?.lsKey;
          const deleteLSKeyOnError = options?.newPageConfirmationSettings?.deleteLSKeyOnError ?? true;

          if (lsKey && deleteLSKeyOnError) {
            localStorage.removeItem(lsKey);
          }
        }
      }
    }
  }
})(jQuery, Drupal);
