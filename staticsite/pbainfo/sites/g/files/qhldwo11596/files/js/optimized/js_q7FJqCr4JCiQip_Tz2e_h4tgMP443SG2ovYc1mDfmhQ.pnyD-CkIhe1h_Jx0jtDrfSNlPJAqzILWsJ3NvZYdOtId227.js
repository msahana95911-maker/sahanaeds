// v1.6
(($, Drupal, once) => {
  let ajaxBeforeRedirectProcessed = [];
  let beforeRedirectProcessed = [];

  Drupal.behaviors.analyticsHelpersForm = {
    attach: (context) => {
      Drupal.analytics = Drupal?.analytics ?? {};
      Drupal.analytics.formData = Drupal.analytics?.formData ?? {};

      Drupal.analytics.initForm = (formsList) => {
        formsList.forEach((options) => {
          if (options?.externalForm) {
            // Wait for form and handle, and track.
            waitForElement(options.formSelector, () => {
              handleForm(options);
            });
          } else {
            handleForm(options);
          }

          Drupal.analytics.lsNewPageConfirmation.check(options);
        });
      }

      function waitForElement(selector, callback) {
        const $body = $('body');

        const observer = new MutationObserver((mutationsList, observerInstance) => {
          if ($body.find(selector).length) {
            callback($body.find(selector));
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
      }

      /**
       * Form handler.
       *
       * @param {Object} options
       */
      function handleForm(options) {
        $(once('form-listener', options.formSelector, document)).each(() => {
          const form = getForm(options);
          const $form = $(form);
          const $submitButton = $form.find(options?.submitButtonSelector ?? 'input[type="submit"]');

          form.setAttribute('data-form-name', options.formName);
          form.setAttribute('data-form-type', options.formType);

          $submitButton.addClass('data-analytics-form-submit data-analytics-click-link');

          $submitButton.each(function () {
            let name = Drupal.t('Submit');
            if (this.value) {
              name = this.value;
            } else if (this.innerText) {
              name = this.innerText;
            }

            Drupal.analytics.addDataAnalyticsLink(this, {
              name: name,
            });
          });

          if (options?.addCustomClasses) {
            for (const [key, value] of Object.entries(options.addCustomClasses)) {
              $form.find(key).addClass(value);
            }
          }

          // Check result on a new page after redirect.
          if (options?.newPageConfirmation) {
            window.onload = () => collectAndExecute(options);
            Drupal.analytics.lsNewPageConfirmation.init(form, options);
          }

          $submitButton.on('click', () => {
            Drupal.analytics.formData = formValues(form);
            collectAndExecute(options);
          });
          $submitButton.on('keydown', (event) => {
            if (event.key === 'Enter') {
              Drupal.analytics.formData = formValues(form);
              collectAndExecute(options);
            }
          });
        });
      }

      /**
       * Get the form element.
       *
       * @param {Object} options
       * @return {Element}
       */
      function getForm(options) {
        let form = document.querySelector(`${options.formSelector}`);
        if (form.tagName.toLowerCase() !== 'form') {
          form = document.querySelector(`${options.formSelector} form`);
        }
        return form;
      }

      /**
       * Collect all function calls for delay timeout and execute with final
       * results.
       *
       * @param {(Object|undefined)} options
       * @returns
       */
      function collectAndExecute(options = undefined) {
        const delay = options?.delay ?? 100;

        if (options?.formCompleteBeforeRedirect) {
          if (options?.ajax) {
            $(document).off('ajaxComplete').on('ajaxComplete', (event, xhr, settings) => {
              setTimeout(() => formError(options), delay);
            });
            formCompleteBeforeAjaxRedirect(options);

            if (options?.jsValidation) {
              setTimeout(() => formError(options), delay);
            }
          } else {
            if (options?.jsValidation) {
              formCompleteBeforeRedirect(options);
            }
          }
        } else {
          if (options?.ajax) {
            $(document).off('ajaxComplete').on('ajaxComplete', (event, xhr, settings) => {
              setTimeout(() => checkForm(options), delay);
            });
          }

          if (options?.jsValidation) {
            setTimeout(() => checkForm(options), delay);
          }
        }

        if (!options?.ajax && !options?.jsValidation) {
          setTimeout(() => checkForm(options), delay);
        }
      }

      /**
       * Check form.
       *
       * @param {Object} options
       */
      function checkForm(options) {
        const errors = formError(options);
        if (!errors) {
          formComplete(options);
        }
      }

      /**
       * Trigger form_complete event and redirect after delay for Ajax form.
       *
       * @param {Object} options
       */
      function formCompleteBeforeAjaxRedirect(options) {
        if (!ajaxBeforeRedirectProcessed.includes(options.formSelector)) {
          const redirectDelay = options?.formCompleteBeforeRedirectSettings?.delay ?? 2000;
          const originalWebformRefresh = Drupal.AjaxCommands.prototype.webformRefresh;

          Drupal.AjaxCommands.prototype.webformRefresh = function (ajax, response, status) {
            const self = this;

            formComplete(options);

            setTimeout(() => {
              // Call the original webformRefresh command to proceed with the default behavior.
              originalWebformRefresh.call(self, ajax, response, status);
            }, redirectDelay);
          };

          ajaxBeforeRedirectProcessed = [ ...ajaxBeforeRedirectProcessed, options.formSelector ];
        }
      }

      /**
       * Trigger form_complete event and redirect after delay for regular form.
       *
       * @param {Object} options
       */
      function formCompleteBeforeRedirect(options) {
        if (!beforeRedirectProcessed.includes(options.formSelector)) {
          const form = getForm(options);
          form.addEventListener('submit', function(event) {
            event.preventDefault();

            setTimeout(() => {
              const errors = formError(options);
              if (!errors) {
                formComplete(options);

                const redirectDelay = options?.formCompleteBeforeRedirectSettings?.delay ?? 2000;

                setTimeout(() => {
                  this.submit();
                }, redirectDelay);
              }
            }, options?.delay ?? 100);
          });

          beforeRedirectProcessed = [ ...beforeRedirectProcessed, options.formSelector ];
        }
      }

      /**
       * Collect form values.
       *
       * @param {Element} form
       */
      function formValues(form) {
        const elements = form.elements;
        const result = {};

        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const name = element.name;

          // Skip elements without a name or disabled elements
          if (!name || element.disabled) continue;

          switch (element.type) {
            case 'checkbox':
              result[name] = element.checked;
              break;
            case 'radio':
              if (element.checked) {
                result[name] = element.value;
              } else if (!(name in result)) {
                result[name] = null;
              }
              break;
            case 'select-multiple':
              result[name] = Array.from(element.selectedOptions).map(option => option.value);
              break;
            default:
              result[name] = element.value;
          }
        }
        return result;
      }

      /**
       * Find form.
       *
       * @param {Element} element
       */
      function findForm(element) {
        while (true) {
          element = element.parentElement;
          const form = element.querySelector('form');
          if (form) return form;
        }
      }

      /**
       * Through event of form successful submission.
       *
       * @param {Object} options
       */
      function formComplete(options) {
        const getData = () => {
          const data = {
            form_name: options.formName,
            form_type: options.formType,
          };

          if (options?.formFieldPopulated) {
            const formFieldPopulated = [];
            options.formFieldPopulated.forEach((field) => {
              if (Drupal.analytics.formData[field]) {
                formFieldPopulated.push(`${field}:${Drupal.analytics.formData[field]}`);
              }
            });
            if (formFieldPopulated.length) {
              data.form_field_populated = formFieldPopulated.join();
            }
          }

          return data;
        };

        if (options?.resultSelector) {
          const selector = `${options.formSelector} ${options.resultSelector}`;
          const $formResultEl = $(`${selector}:visible`);

          if ($formResultEl.length) {
            const form = findForm($formResultEl[0]);
            const results = formValues(form);
            const data = getData();

            if (options?.formResult) {
              data.form_result = $(form).find(options.formResult).first().text();
            }

            $(document).trigger('form_complete', { data });
          }
        } else if (options?.formCompleteBeforeRedirect) {
          const data = getData();
          $(document).trigger('form_complete', { data });
        }
      }

      /**
       * Through event of form error submission.
       *
       * @param {Object} options
       * @return boolean
       */
      function formError(options) {
        if (options?.errorSelector) {
          const $errors = $(options.formSelector).find(options.errorSelector);
          let errors = [];

          $errors.each(function () {
            const $item = $(this);
            const item = $item[0];
            const isErrorVisible = $item.is(':visible');
            let errorMessage;

            if (isErrorVisible) {
              if (item.tagName.toLowerCase() === 'select') {
                for (const option of item.options) {
                  if (option.defaultSelected) {
                    errorMessage = option.text;
                    break;
                  }
                }
              } else {
                errorMessage = item.innerText.replace(/["'`\n\r\t\0\v]/g, '');
              }
              if (!errorMessage) {
                errorMessage = item.getAttribute('placeholder');
              }
              errorMessage = errorMessage?.trim();

              let name = '';
              const $formItem = $item.closest('.form-item');
              const $fieldset = $item.closest('fieldset');

              if ($formItem.hasClass('js-form-type-checkbox')) {
                name = $formItem.find('input').attr('name');
                errorMessage ??= Drupal.t('Required');
              } else if ($fieldset.hasClass('radios--wrapper')) {
                name = $fieldset.find('input').attr('name');
                errorMessage ??= Drupal.t('Required');
              } else if (!options?.simpleErrorsFormat) {
                name = $item.parent().find('input, select, textarea').attr('name');
              }

              if (errorMessage) {
                if (name) {
                  errors.push(`${name}^${errorMessage}`);
                } else {
                  errors.push(errorMessage);
                }
              }
            }
          });

          if (options?.captcha) {
            const $captchaErrorWrapper = $(options.formSelector).find(options.captcha.errorSelector);
            if ($captchaErrorWrapper.length) {
              errors.push(options.captcha.errorMessage);
            }
          }

          if (errors.length) {
            errors = [...new Set(errors)]; // Remove duplicates
            const $form = $(options.formSelector);

            let step;
            if (options?.stepsSelectors) {
              for (const [key, stepSelector] of Object.entries(options.stepsSelectors)) {
                const $stepWrapper = $form.find(`${stepSelector}:visible`);

                if ($stepWrapper.length) {
                  step = key;
                  break;
                }
              }
            }

            // Replace errors if it's needed.
            if (options?.replaceErrors) {
              options.replaceErrors.forEach((replace) => {
                errors = errors.map(error => {
                  return error === replace.from ? replace.to : error;
                });
              });
            }

            const data = {
              form_name: options.formName,
              form_type: options.formType,
              form_error_messages: errors,
            };

            if (step) {
              data.form_step = step;
            }

            $(document).trigger('form_error', { data });

            Drupal.analytics.lsNewPageConfirmation.deleteKey(options);
          }

          return (!!errors.length);
        }

        // No errors.
        return false;
      }
    }
  };
})(jQuery, Drupal, once);
