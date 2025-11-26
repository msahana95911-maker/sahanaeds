// Place here your custom focus scripts.
(function ($, Drupal) {
  Drupal.behaviors.focusAdvanced = {
    attach: function (context) {
      const $body = $('body', context);

      // Modal focus trap.
      $body.on('keydown', '.modal button, .modal a', function (e) {
        if (e.key === 'Tab') {
          const $button = $(this);
          const $popup = $button.closest('.modal');

          if ($button.hasClass('button__cancel') && !e.shiftKey) {
            e.preventDefault();
            $popup.find('.btn-close').trigger('focus');
          }

          if ($button.hasClass('btn-close') && e.shiftKey) {
            e.preventDefault();
            $popup.find('.button__cancel').trigger('focus');
          }
        }
      });
    },
  };
})(jQuery, Drupal);
