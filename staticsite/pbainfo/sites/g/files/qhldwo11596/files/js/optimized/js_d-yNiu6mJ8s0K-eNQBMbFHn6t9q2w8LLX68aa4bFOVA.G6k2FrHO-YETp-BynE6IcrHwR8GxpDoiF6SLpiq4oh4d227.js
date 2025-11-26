(($) => {
  Drupal.behaviors.reactPlayerBehavior = {
    attach(context) {
      const $document = $(document, context);
      const $body = $('body', context);
      const preview = '.react-player-preview';
      const keyCodes = {
        space: 32,
        enter: 13,
      };

      // Add tabindex for React Player preview.
      $body.find(preview).attr('tabindex', '0');

      // Play Video via keyboard.
      $document.on('keydown', preview, function rpPlay(e) {
        const { keyCode } = e;
        if (keyCode === keyCodes.space || keyCode === keyCodes.enter) {
          $(this).click();
        }
      });
    },
  };
})(jQuery);
