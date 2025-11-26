/**
 * @file
 * Dialog initialization external link popup dialog
 */

(function ($, Drupal, drupalSettings) {
  'use strict';

  // Replace openDialog function from the external_link_popup module.
  Drupal.behaviors.externalLinkPopup.openDialog = function (element, settings, className) {
    // Take care about tokens.
    var url = $(element).attr('href');
    var text = $(element).text();
    var bodyHtml = settings.body
      .replace('[link:url]', this.htmlEncode(url))
      .replace('[link:text]', this.htmlEncode(text));

    $('#externalLinkPopupModalLabel').html(settings.title);
    $('#externalLinkPopupModalCloseButton').html(settings.labelno);
    $('#externalLinkPopupModalContinueButton').html(settings.labelyes);
    $('#externalLinkPopupModalContinueButton').unbind('click').bind('click', function () {
      var target = window.open(element.href, element.target, 'noopener');
      $('.modal-content').find('.close').trigger('click');
    });
    $('#externalLinkPopupModalBody').html(bodyHtml);

    // Get version of current Bootstrap library in use.
    var version = bootstrap.Tooltip.VERSION;
    if (version.startsWith('5')) {
      // Remove existing non-aompatible data-dismiss attribute.
      // And add data-bs-dismiss attribute, compatible with Bootstrap 5.
      $('.modal-content').find('.close').removeAttr('data-dismiss').attr('data-bs-dismiss', 'modal');
      $('#externalLinkPopupModalCloseButton').removeAttr('data-dismiss').attr('data-bs-dismiss', 'modal');

      // Create/Open Modal with B5 method.
      var extPopupModal = new bootstrap.Modal('#externalLinkPopupModal');
      extPopupModal.show();
    }
    else {
      // Create/Open Modal with B4 method.
      $('#externalLinkPopupModal').modal();
    }
  };

})(jQuery, Drupal, drupalSettings);
