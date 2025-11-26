(($, Drupal, once) => {
  Drupal.behaviors.analyticsFormModal = {
    attach: (context) => {
      $(once('analytics-form-modal', 'body'))
        .on('dialog:aftercreate shown.bs.modal', (e) => {
          if ($(e.target).find('form').length) {
            $(document).trigger('virtualFormView');
          }
        })
        .on('dialog:beforeclose hide.bs.modal', (e) => {
          if ($(e.target).find('form').length) {
            $(document).trigger('virtualFormAbandon');
          }
        });
    }
  };
})(jQuery, Drupal, once);
