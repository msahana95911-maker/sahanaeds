const OtsukaPCM = Object.create({
  /**
   * Cookie consent management platform.
   */
  cmpPlatform: "onetrust",

  /**
   * Enumeration of service providers.
   */
  providers: {
    VIMEO: "vimeo",
    YOUTUBE: "youtube",
    BUZZSPROUT: "buzzsprout",
    ORBITA: "orbita",
  },

  /**
   * The module settings contained within drupalSettings.
   */
  settings: drupalSettings.privacy_compliant_media_settings,

  /**
   * Get the module settings for the supplied provider.
   * @param {string} provider The provider to get the settings for.
   * @returns {object|null} The settings for the supplied provider, if found,
   *   otherwise null.
   */
  getProviderSettings: function (provider) {
    switch (provider) {
      case this.providers.VIMEO:
        return this.settings.vimeo;
      case this.providers.YOUTUBE:
        return this.settings.youtube;
      case this.providers.BUZZSPROUT:
        return this.settings.buzzsprout_podcasts;
      case this.providers.ORBITA:
        return this.settings.orbita_live_chat;
      default:
        return null;
    }
  },
  overlayImageClassname: "otsuka-pcm-img-overlay",
  videoThumbnailClassname: "otsuka-pcm-video-thumbnail",
  thumbnailOverlayClassname: "otsuka-pcm-img-overlay__transparent",
  thumbnailOverlayDefaultClassname: "with-default-video-overlay",
  thumbnailOverlayCustomClassname: "with-custom-video-overlay",
  buzzsproutPlaceholderDefaultClassname: "with-default-buzzsprout-placeholder",
  buzzsproutPlaceholderCustomClassname: "with-custom-buzzsprout-placeholder",
  overlayClassname: "otsuka-pcm-consent-overlay",
  modalClassname: "otsuka-pcm-consent-modal",

  /**
   * Handle error messages by printing to console.
   * @param {string} message The error message text.
   */
  printError: function (message) {
    console.error(this.formatErrorMessage(message));
  },

  /**
   * Handle error messages by printing to console.
   * @param {string} message The error message text.
   */
  throwError: function (message) {
    throw new Error(this.formatErrorMessage(message));
  },

  /**
   * Format error messages.
   * @param {string} message The error message text.
   * @returns {string} The formatted error message.
   */
  formatErrorMessage: function (message) {
    return `OtsukaPCM: ${message}`;
  },

  /**
   * Creates a DOM element from the supplied text.
   * @param {string} text The text to add to the generated Element.
   * @param {string} tagName The tag name to wrap the supplied text in.
   * @param {boolean} strip Whether or not to strip the outer Element from the
   *   returned value.
   * @returns {Element} The generated DOM Element.
   */
  createElementFromText: function (text, tagName = "div", strip = true) {
    let element = document.createElement(tagName);
    element.innerHTML = text ?? "";
    return strip ? element.firstChild : element;
  },

  /**
   * Wait for the OneTrust object to be found.
   * @returns {Promise} A Promise that resolves when OneTrust is found, or
   *   rejects after a preset amount of time.
   */
  awaitOneTrust: function () {
    return new Promise(function (resolve, reject) {
      if (typeof OneTrust === "object") {
        resolve(OneTrust);
      }

      let attempt = 0;
      const maxAttempts = 50;
      const interval = setInterval(() => {
        if (typeof OneTrust === "object") {
          clearInterval(interval);
          resolve(OneTrust);
        }
        attempt++;
        if (attempt >= maxAttempts) {
          clearInterval(interval);
          reject(
            OtsukaPCM.formatErrorMessage(
              "awaitOneTrust: OneTrust not found within allotted time"
            )
          );
        }
      }, 100);
    });
  },

  /**
   * Wait for the consent management platform to be found.
   * @returns {Promise} A Promise that resolves when the CMP is found, or
   *   rejects after a preset amount of time.
   */
  awaitCMP: function () {
    switch (this.cmpPlatform) {
      case "onetrust":
        return this.awaitOneTrust();
      default:
        return Promise.reject();
    }
  },

  /**
   * Wait for the Orbita chatbot object to be found and for the chatbot to be
   * loaded.
   * @returns {Promise} A Promise that resolves when the chatbot is found, or
   *   rejects after a preset amount of time.
   */
  awaitOrbitaChatbot: function () {
    return new Promise(function (resolve, reject) {
      if (
        typeof OrbitaChatBotV3 === "object" &&
        Object.hasOwn(OrbitaChatBotV3, "botLoaded") &&
        OrbitaChatBotV3.botLoaded()
      ) {
        resolve(OrbitaChatBotV3);
      }

      let attempt = 0;
      const maxAttempts = 50;
      const interval = setInterval(() => {
        if (
          typeof OrbitaChatBotV3 === "object" &&
          Object.hasOwn(OrbitaChatBotV3, "botLoaded") &&
          OrbitaChatBotV3.botLoaded()
        ) {
          clearInterval(interval);
          resolve(OrbitaChatBotV3);
        }
        attempt++;
        if (attempt >= maxAttempts) {
          clearInterval(interval);
          this.throwError(
            "awaitOrbitaChatbot: Orbita Chatbot not found within allotted time"
          );
          reject();
        }
      }, 100);
    });
  },

  /**
   * Wait for the Orbita chat button to be found in the DOM.
   * @returns {Promise} A Promise that resolves when the chat button is found,
   *   or rejects after a preset amount of time.
   */
  awaitOrbitaChatButton: function (selector = 'button[aria-label="Show Chatbot"]') {
    return new Promise(function (resolve, reject) {
      const orbitaButton = document.querySelector(selector);
      if (orbitaButton) {
        resolve(orbitaButton);
      }

      let attempt = 0;
      const maxAttempts = 50;
      const interval = setInterval(() => {
        const orbitaButton = document.querySelector(selector);
        if (orbitaButton) {
          clearInterval(interval);
          resolve(orbitaButton);
        }
        attempt++;
        if (attempt >= maxAttempts) {
          clearInterval(interval);
          this.throwError(
            "awaitOrbitaChatButton: Orbita chat button not found within allotted time"
          );
          reject();
        }
      }, 100);
    });
  },

  /**
   * OneTrust: Checks if the visitor is consented to the specified cookie
   * category.
   * @param {string} category_id The cookie category to check for consent.
   * @returns {boolean} Whether the visitor is consented to the specified
   *   cookie category.
   */
  isConsentedToCategoryOneTrust: async function (category_id) {
    // Wait for CMP object.
    try {
      await this.awaitOneTrust();
    } catch (e) {
      throw e;
    }

    return OnetrustActiveGroups?.split(",").includes(category_id);
  },

  /**
   * Checks if the visitor is consented to the specified cookie category.
   * @param {string} category_id The cookie category to check for consent.
   * @returns {boolean} Whether the visitor is consented to the specified
   *   cookie category.
   */
  isConsentedToCategory: async function (category_id) {
    switch (this.cmpPlatform) {
      case "onetrust":
        try {
          const isConsented = await this.isConsentedToCategoryOneTrust(
            category_id
          );
          return isConsented;
        } catch (e) {
          throw e;
        }
      default:
        return false;
    }
  },

  /**
   * OneTrust: Consents/opts-in the visitor to the specified cookie category.
   * @param {string} category_id The category to consent/opt-in to.
   * @returns {boolean} Whether the action succeeded or not.
   */
  consentToCategoryOneTrust: async function (category_id) {
    // Wait for CMP object.
    try {
      await this.awaitOneTrust();
    } catch (e) {
      this.throwError(
        "consentToCategoryOneTrust: Error consenting to OneTrust category"
      );
      return false;
    }

    OneTrust.UpdateConsent("Category", `${category_id}:1`);
    return true;
  },

  /**
   * Consents/opts-in the visitor to the specified cookie category.
   * @param {string} category_id The category to consent/opt-in to.
   */
  consentToCategory: async function (category_id) {
    let result = false;
    switch (this.cmpPlatform) {
      case "onetrust":
        result = await this.consentToCategoryOneTrust(category_id);
        break;
    }
    return result;
  },

  /**
   * Loads the supplied script by setting its `src` attribute to its `data-src`
   * attribute.
   * @param {Element} script The script Element to operate on.
   */
  insertScript: function (script) {
    script.src = script.getAttribute("data-src");
  },

  /**
   * UNUSED. Uses OneTrust's InsertScript function to insert a script tag into
   * the DOM if a specified cookie category is opted-in to.
   * @param {object} param0 The set of parameters to pass to the InsertScript
   *   function.
   */
  insertScriptIfConsented: async function ({
    url,
    selector,
    callback = null,
    options = null,
    categoryId,
    async = false,
  }) {
    // Wait for CMP object.
    try {
      await this.awaitOneTrust();
    } catch (e) {
      this.throwError("insertScriptIfConsented: Error inserting script");
      return false;
    }

    // @see https://my.onetrust.com/s/article/UUID-d8291f61-aa31-813a-ef16-3f6dec73d643?language=en_US#UUID-d8291f61-aa31-813a-ef16-3f6dec73d643_section-idm231900142186795
    OneTrust.InsertScript(url, selector, callback, options, categoryId, async);
  },

  /**
   * Returns the cookie consent category ID, specified in the module backend
   * settings, for the supplied provider.
   * @param {string} provider The provider to get the consent category for.
   * @returns {string|null} The category ID for the specified provider, if
   *   found, otherwise null.
   */
  getConsentCategoryForProvider: function (provider) {
    return this.getProviderSettings(provider)?.cat_id;
  },

  /**
   * Generates a unique DOM Element ID.
   * @param {string} p A prefix to prepend to the generated ID.
   * @returns {string} The generated ID.
   */
  genUID: function (p) {
    var c = 0,
      i;
    p = typeof p === "string" ? p : "";
    do {
      i = p + c++;
    } while (document.getElementById(i) !== null);
    return i;
  },

  /**
   * Checks if the specified URL contains a query string.
   * @param {string} url The URL to check.
   * @returns {boolean} Whether or not the specified URL contains a query
   *   string.
   */
  hasQueryString: function (url) {
    return url.indexOf("?") != -1;
  },

  /**
   * Creates a script Element in the DOM with the specified ID attribute.
   * @param {string} src The URL of the script to load.
   * @param {string} id The ID attribute to add to the generated script
   *   Element.
   * @returns {Promise} A Promise that resolves if the specified Element ID
   *   already exists, or when the new script Element is loaded by the browser.
   */
  loadScript: function (src, id) {
    return new Promise(function (resolve, reject) {
      if (document.getElementById(id)) {
        resolve();
      } else {
        const script = document.createElement("script");
        script.onload = resolve;
        script.id = id;
        script.src = src;
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(script, firstScriptTag);
      }
    });
  },

  /**
   * Loads the YouTube Player API for iframe embeds.
   * @returns {Promise} A Promise that resolves when the YoutTube API is found,
   *   or rejects after a preset amount of time.
   */
  loadYouTubeAPI: function () {
    function apiExists() {
      return "undefined" !== typeof YT && YT.loaded;
    }
    if (apiExists()) {
      return;
    }
    const promises = [];
    promises.push(
      this.loadScript("https://www.youtube.com/iframe_api", "youtube-api")
    );
    promises.push(
      new Promise(function (resolve, reject) {
        // Set an interval to keep checking.
        const intervalId = setInterval(function () {
          if (apiExists()) {
            // API now exists, clear interval and resolve.
            clearInterval(intervalId);
            resolve();
          }
        }, 100);
      })
    );
    return Promise.all(promises);
  },

  /**
   * Loads the Vimeo Player SDK.
   * @returns {Promise} A Promise that resolves when the Vimeo SDK is found, or
   *   rejects after a preset amount of time.
   */
  loadVimeoAPI: function () {
    function apiExists() {
      return "undefined" !== typeof Vimeo;
    }
    if (apiExists()) {
      return;
    }
    const promises = [];
    promises.push(
      this.loadScript("https://player.vimeo.com/api/player.js", "vimeo-api")
    );
    promises.push(
      new Promise(function (resolve, reject) {
        // Set an interval to keep checking.
        const intervalId = setInterval(function () {
          if (apiExists()) {
            // API now exists, clear interval and resolve.
            clearInterval(intervalId);
            resolve();
          }
        }, 100);
      })
    );
    return Promise.all(promises);
  },

  /**
   * Loads a player API for the specified provider.
   * @param {string} provider The provider to load an API for.
   * @returns {Promise} A Promise that resolves when the specified provider's
   *   API is found, or rejects after a preset amount of time.
   */
  loadPlayerAPI: function (provider) {
    switch (provider) {
      case this.providers.VIMEO:
        return this.loadVimeoAPI();
      case this.providers.YOUTUBE:
        return this.loadYouTubeAPI();
      default:
        return Promise.resolve();
    }
  },

  /**
   * Begins playback of the specified iframe video player.
   *
   * The iframe must not already be loaded by the browser and must have a
   * `data-src` attribute. Also checks the module settings for the video
   * provider of the iframe and alters the video src URL for "privacy-enhanced
   * mode" when applicable.
   * @param {Element} iframe The iframe element to load and begin playback.
   * @returns {void}
   */
  playIframeVideo: function (iframe) {
    const dataSrc = iframe.getAttribute("data-src");
    const { provider, video_id } = this.isManagedSrc(dataSrc);
    const matcher = /(\/media\/oembed\?url=)([^&]+)(.+)/;
    const isOembed = dataSrc.match(matcher);

    iframe.style.display = "block";

    const dependent_cat_id =
      this.getProviderSettings(provider).dependent_cat_id;
    const privacy_enhanced =
      dependent_cat_id && !this.isConsentedToCategory(dependent_cat_id);

    let iframeSrc = dataSrc;

    // oEmbed
    if (isOembed) {
      if (privacy_enhanced) {
        iframeSrc +=
          (this.hasQueryString(iframeSrc) ? "&" : "?") + "privacy_enhanced=1";
      }
      iframe.src = iframeSrc;
      // @todo Fix for Safari autoplay.
      return;
    }

    // iframe embed
    switch (provider) {
      case this.providers.VIMEO:
        if (privacy_enhanced) {
          iframeSrc += (this.hasQueryString(iframeSrc) ? "&" : "?") + "dnt=1";
        }
        iframe.src = iframeSrc;
        const player = new Vimeo.Player(iframe.id);
        player
          .play()
          .then(function () {})
          .catch(function (e) {
            switch (e.name) {
              case "NotAllowedError":
                // Reload player so initial frame is shown, otherwise it can appear blank.
                player.unload().then(function () {
                  loadVideo(video_id);
                });
                break;
            }
          });
        break;
      case this.providers.YOUTUBE:
        if (privacy_enhanced) {
          iframeSrc = iframeSrc.replace(
            /(youtu\.be|youtube\.com)\//,
            "youtube-nocookie.com/"
          );
        }
        iframeSrc +=
          (this.hasQueryString(dataSrc) ? "&" : "?") + "enablejsapi=1";
        iframe.src = iframeSrc;
        new YT.Player(iframe.id, {
          events: {
            onReady: function (event) {
              event.target.playVideo();
            },
          },
        });
        break;
    }

    // Fix for Safari.
    iframe.querySelector(`video`)?.play();
  },

  /**
   * Checks if the supplied URL is for a media type or script that the module
   * manages consent for.
   * @param {string} src The URL of the video or script to check.
   * @returns {object|false} If the supplied URL is consent-managed by the
   *   module, returns an object with information about the supplied URL,
   *   otherwise returns false.
   */
  isManagedSrc: function (src) {
    let matcher =
      /(youtu\.be|youtube\.com|youtube-nocookie\.com)\/(embed\/|watch\?v=)?([^?&]+)/;
    let match = src?.match(matcher);
    if (match && match[3]) {
      return {
        domain: match[1],
        video_id: match[3],
        provider: this.getProviderByDomain(match[1]),
      };
    }
    matcher = /(vimeo\.com)\/(video\/)?([0-9]+)/;
    match = src?.match(matcher);
    if (match && match[3]) {
      return {
        domain: match[1],
        video_id: match[3],
        provider: this.getProviderByDomain(match[1]),
      };
    }
    matcher = /(buzzsprout\.com)\/([0-9]+)\.js/;
    match = src?.match(matcher);
    if (match && match[2]) {
      return {
        domain: match[1],
        subscription_id: match[2],
        provider: this.getProviderByDomain(match[1]),
      };
    }
    matcher = /(orbita\.(cloud|com))(.*)\/chatbot\//;
    match = src?.match(matcher);
    if (match && match[2]) {
      return {
        domain: match[1],
        provider: this.getProviderByDomain(match[1]),
      };
    }
    return false;
  },

  /**
   * Checks if the supplied iframe Element is for a media type that the module
   * manages consent for. The iframe must have a `data-src` attribute.
   * @param {Element} iframe The iframe Element to check.
   * @returns {object|false} The result of calling `isManagedSrc()` on the
   *   iframe's `data-src` attribute, otherwise false.
   */
  isManagedIframe: function (iframe) {
    return iframe && this.isManagedSrc(iframe.getAttribute("data-src"));
  },

  /**
   * Returns the provider name for the supplied iframe Element, as returned by
   * calling `isManagedIframe()`.
   * @param {Element} iframe The iframe to get the provider for.
   * @returns {string|false} The provider name, if found, otherwise false.
   */
  getProviderByIframe: function (iframe) {
    const { provider } = this.isManagedIframe(iframe);
    return provider;
  },

  /**
   * Returns the provider name for the supplied domain name.
   * @param {string} domain The domain name to check.
   * @returns {string|false} The provider name for the supplied domain name, if
   *   found, otherwise false.
   */
  getProviderByDomain: function (domain) {
    switch (domain) {
      case "vimeo.com":
        return this.providers.VIMEO;
      case "youtube.com":
      case "youtu.be":
      case "youtube-nocookie.com":
        return this.providers.YOUTUBE;
      case "buzzsprout.com":
        return this.providers.BUZZSPROUT;
      case "orbita.com":
      case "orbita.cloud":
        return this.providers.ORBITA;
    }
    return false;
  },

  /**
   * Checks whether the specified provider is enabled for consent-management in
   * the module settings.
   * @param {string} provider The provider name to check.
   * @returns {boolean} Returns true if the specified provider is found and
   *   enabled, otherwise false.
   */
  isProviderEnabled: function (provider) {
    return this.getProviderSettings(provider)?.enabled || false;
  },

  /**
   * Gets the consent overlay Element, if present, from inside the specified
   * target Element.
   * @param {Element} target The DOM Element to search inside of.
   * @returns {Element|null} The consent overlay DOM Element, if found,
   *   otherwise null.
   */
  getConsentOverlay: function (target) {
    const id = target.getAttribute("id");
    return id
      ? document.querySelector(`#${id} > .${this.overlayClassname}`)
      : null;
  },

  /**
   * Removes the consent overlay Element, if present, from inside the specified
   * target Element.
   * @param {Element} target The DOM Element to search inside of.
   */
  removeConsentOverlay: function (target) {
    this.getConsentOverlay(target)?.remove();
  },

  /**
   * Observe the target element width and add class at threshold.
   *
   * Used with CSS to change the display of the consent modal.
   */
  consentModalResizeObserver: new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.borderBoxSize[0].inlineSize > 600) {
        // Ensure our effect occurs after ResizeObserver completes.
        setTimeout(() => entry.target.classList.add("wide"), 0);
      } else {
        // Ensure our effect occurs after ResizeObserver completes.
        setTimeout(() => entry.target.classList.remove("wide"), 0);
      }
    }
  }),

  /**
   * Observe the target element width and add class at threshold.
   *
   * Used with CSS to change which overlay (play button) image is used.
   */
  videoOverlayResizeObserver: new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.borderBoxSize[0].inlineSize > 600) {
        entry.target.classList.add("wide");
      } else {
        entry.target.classList.remove("wide");
      }
    }
  }),

  /**
   * Creates a consent modal using the specified options.
   * @param {object} param0 The options for the generated consent modal.
   * @returns {Element} The generated consent modal.
   */
  getConsentModal: function ({
    target,
    provider,
    consentCallback = null,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    const consent_category = this.getConsentCategoryForProvider(provider);
    const providerSettings = this.getProviderSettings(provider);
    const dialogTitleId = this.genUID("otsuka-pcm-dialogTitle-id-");
    const dialogDescId = this.genUID("otsuka-pcm-dialogDesc-id-");

    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby", dialogTitleId);
    modal.setAttribute("aria-describedby", dialogDescId);
    modal.classList.add(this.modalClassname);
    modal.classList.add(provider);

    modal.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    let closeButton;

    if (withCloseButton) {
      closeButton = document.createElement("div");
      closeButton.className = "otsuka-pcm-consent-close";
      closeButton.innerHTML = "&#10005;";
      closeButton.setAttribute("role", "button");
      closeButton.setAttribute("aria-label", "Close");
      closeButton.setAttribute("tabindex", "0");
      closeButton.addEventListener("click", () => {
        this.removeConsentOverlay(target);
        cancelCallback && cancelCallback();
      });
      // Listen for keyboard events.
      closeButton.addEventListener("keydown", (e) => {
        if ("Enter" === e.key) {
          e.target.click();
        }
      });
    }

    const dialogTitle = document.createElement("h2");
    dialogTitle.setAttribute("id", dialogTitleId);
    dialogTitle.setAttribute("hidden", "hidden");
    dialogTitle.setAttribute("aria-hidden", true);
    dialogTitle.innerHTML = "Consent request";

    const content = document.createElement("div");
    content.setAttribute("id", dialogDescId);
    content.className = "otsuka-pcm-consent-content";
    content.innerHTML = providerSettings.modal.description;

    // Add an "I agree" button, which when clicked removes the overlay
    // and executes the consentCallback.
    const consentButton = document.createElement("button");
    consentButton.className = "otsuka-pcm-consent-button";
    consentButton.innerHTML = providerSettings.modal.consent_label;
    consentButton.addEventListener("click", async () => {
      consentButton.setAttribute("disabled", "");
      //Enables consent for the current consent category
      if (await this.consentToCategory(consent_category)) {
        // Remove the overlay and load the video player.
        modal.parentNode.remove();
        consentCallback && consentCallback();
      }
      consentButton.removeAttribute("disabled");
    });

    let moreLink;
    const moreLinkLabel = providerSettings.modal.morelink_label;
    const moreLinkUrl = providerSettings.modal.morelink_url;

    if (moreLinkLabel && moreLinkUrl) {
      moreLink = document.createElement("a");
      moreLink.className = "otsuka-pcm-consent-link";
      moreLink.href = moreLinkUrl;
      moreLink.innerHTML = moreLinkLabel;
      moreLink.setAttribute("role", "button");
      moreLink.setAttribute("aria-label", moreLinkLabel);
    }

    // Add the elements to the modal.
    if (closeButton) {
      modal.append(closeButton);
    }
    modal.append(dialogTitle, content, consentButton);
    if (moreLink) {
      modal.append(moreLink);
    }

    // Observe the modal for resizing.
    this.consentModalResizeObserver.observe(modal);

    return modal;
  },

  /**
   * Creates an error modal using the specified options.
   * @param {object} param0 The options for the generated error modal.
   * @returns {Element} The generated error modal.
   */
  getErrorModal: function ({
    target,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    const dialogTitleId = this.genUID("otsuka-pcm-dialogTitle-id-");
    const dialogDescId = this.genUID("otsuka-pcm-dialogDesc-id-");

    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby", dialogTitleId);
    modal.setAttribute("aria-describedby", dialogDescId);
    modal.classList.add(this.modalClassname);

    modal.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    let closeButton;

    if (withCloseButton) {
      closeButton = document.createElement("div");
      closeButton.className = "otsuka-pcm-consent-close";
      closeButton.innerHTML = "&#10005;";
      closeButton.setAttribute("role", "button");
      closeButton.setAttribute("aria-label", "Close");
      closeButton.addEventListener("click", () => {
        this.removeConsentOverlay(target);
        cancelCallback && cancelCallback();
      });
    }

    const dialogTitle = document.createElement("h2");
    dialogTitle.setAttribute("id", dialogTitleId);
    dialogTitle.setAttribute("hidden", "hidden");
    dialogTitle.setAttribute("aria-hidden", true);
    dialogTitle.innerHTML = "Error message";

    const content = document.createElement("div");
    content.setAttribute("id", dialogDescId);
    content.className = "otsuka-pcm-error-content";
    content.innerHTML = this.settings.general.error_cmp_not_found;

    // Add the elements to the modal.
    if (closeButton) {
      modal.append(closeButton);
    }
    modal.append(dialogTitle, content);

    // Observe the modal for resizing.
    this.consentModalResizeObserver.observe(modal);

    return modal;
  },

  /**
   * Creates a consent overlay, containing a consent modal, using the specified
   * options.
   * @param {object} param0 The options for the generated consent modal.
   * @returns {Element} The generated consent overlay Element.
   */
  createConsentOverlay: function ({
    target,
    provider,
    consentCallback = null,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    const overlay = document.createElement("div");
    overlay.classList.add(this.overlayClassname);
    overlay.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    const providerSettings = this.getProviderSettings(provider)
    if (providerSettings.modal.description !== '') {
      const modal = this.getConsentModal({
        target: target,
        provider: provider,
        consentCallback: consentCallback,
        cancelCallback: cancelCallback,
        withCloseButton: withCloseButton,
      });
      overlay.append(modal);
    }
    return overlay;
  },

  /**
   * Creates an error overlay, containing an error modal, using the specified
   * options.
   * @param {object} param0 The options for the generated error modal.
   * @returns {Element} The generated error overlay Element.
   */
  createErrorOverlay: function ({
    target,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    const overlay = document.createElement("div");
    overlay.classList.add(this.overlayClassname);
    overlay.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    const modal = this.getErrorModal({
      target: target,
      cancelCallback: cancelCallback,
      withCloseButton: withCloseButton,
    });
    overlay.append(modal);
    return overlay;
  },

  /**
   * Fetches the thumbnail image URL for the supplied Vimeo video ID.
   * @param {string|number} video_id The ID of the video to get the thumbnail
   *   for.
   * @returns {string} The URL of the thumbnail image, if found, otherwise
   *   false.
   */
  getVimeoThumbnailUrl: async function (video_id, size={width: 295, height: 166}) {
    try {
      const url = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${video_id}`;
      const response = await fetch(url);
      const data = await response.json();
      const {width, height} = size;
      const updatedUrl = data.thumbnail_url.replace(/d_(\d+)x(\d+)/, `d_${width}x${height}`);
      return updatedUrl;
    } catch (error) {
      this.throwError(
        "getVimeoThumbnailUrl: Error fetching Vimeo thumbnail: ",
        error
      );
    }
    return false;
  },

  /**
   * Returns the thumbnail image URL for the supplied YouTube video ID.
   * @param {string} video_id The ID of the video to get the thumbnail for.
   * @returns {string} The URL of the thumbnail image.
   */
  getYoutubeThumbnailUrl: function (video_id) {
    return `https://img.youtube.com/vi/${video_id}/maxresdefault.jpg`;
  },

  /**
   * Returns the thumbnail image URL for the supplied provider and video ID.
   * @param {string} provider The video service provider name.
   * @param {string|number} video_id The ID of the video to get the thumbnail
   *   for.
   * @returns {string|false} The URL of the thumbnail image, if found,
   *   otherwise false.
   */
  getThumbnailUrl: async function (provider, video_id, size={width: 295, height: 166}) {
    switch (provider) {
      case this.providers.VIMEO:
        return await this.getVimeoThumbnailUrl(video_id, size);
      case this.providers.YOUTUBE:
        return this.getYoutubeThumbnailUrl(video_id);
    }
    return false;
  },

  /**
   * Returns an `img` Element for the thumbnail image of the supplied provider
   * and video ID.
   * @param {string} provider The video service provider name.
   * @param {string|number} video_id The ID of the video to get the thumbnail
   *   for.
   * @returns {Element} The generated `img` Element for the thumbnail.
   */
  getThumbnailImgForVideo: async function (provider, video_id, size={width: 295, height: 166}) {
    const img = document.createElement("img");
    img.classList.add(this.videoThumbnailClassname);
    img.src = await this.getThumbnailUrl(provider, video_id, size);
    return img;
  },

  /**
   * Returns an `img` Element for the thumbnail image of the media contained in
   * the supplied iframe.
   * @param {Element} iframe The iframe Element to get the thumbnail image for.
   * @returns The result of calling `getThumbnailImgForVideo()` for the
   */
  getThumbnailImgForIframe: async function (iframe) {
    const width = iframe.clientWidth;
    const height = iframe.clientHeight;
    const { video_id, provider } = this.isManagedIframe(iframe);
    return this.getThumbnailImgForVideo(provider, video_id, {width, height});
  },

  /**
   * Gets the custom overlay image URL for the specified provider.
   * @param {string} provider The provider to get the custom overlay image URL
   *   for.
   * @returns {string} The URL of the custom overlay image, if found, otherwise
   *   false.
   */
  getOverlayImageSrc: function (provider) {
    return this.getProviderSettings(provider)?.overlay_image || false;
  },

  /**
   * Gets the custom overlay image Element for the specified provider.
   * @param {string} provider The provider to get the custom overlay image for.
   * @returns {Element|false} The custom overlay image Element, if found,
   *   otherwise false.
   */
  getOverlayImage: function (provider) {
    const imgOverlaySrc = this.getOverlayImageSrc(provider);

    if (!imgOverlaySrc) {
      return false;
    }

    const imgOverlay = document.createElement("img");
    imgOverlay.src = imgOverlaySrc;
    imgOverlay.setAttribute("class", this.overlayImageClassname);
    return imgOverlay;
  },

  /**
   * Sets styles on the supplied iframe Element and its parent node to make it
   * 16:9 responsive aspect ratio.
   * @param {Element} iframe The iframe Element to operate on.
   */
  makeResponsiveIframe: function (iframe) {
    // Make the video frame responsive, based on 16:9 ratio.
    iframe.parentNode.setAttribute(
      "style",
      "width:100%; height:0; position:relative; padding-bottom:56.25%"
    );
    iframe.setAttribute(
      "style",
      "width:100%; height:100%; position:absolute; left:0; top:0"
    );
  },

  /**
   * Creates an error modal in the specified target DOM element.
   * @param {object} param0 An object containing additional options.
   * @returns {void}
   */
  doErrorModal: function ({
    target,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    const hasOverlay = this.getConsentOverlay(target);
    // If the overlay is already open, do nothing.
    if (hasOverlay) {
      return;
    }

    if (!target.getAttribute("id")) {
      // Add an id attribute for use by `getConsentOverlay()`.
      const id = this.genUID("otsuka-pcm-overlay-id-");
      target.setAttribute("id", id);
    }

    const overlay = this.createErrorOverlay({
      target: target,
      cancelCallback: cancelCallback,
      withCloseButton: withCloseButton,
    });

    target.append(overlay);
  },

  /**
   * Creates a consent modal in the specified target DOM element. If the
   * specified provider is not enabled in the module settings, does nothing
   * except to call consentCallback, if provided.
   * @param {object} param0 An object containing additional options.
   * @returns {void}
   */
  doConsentModal: async function ({
    target,
    provider,
    consentCallback = null,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    if (!this.isProviderEnabled(provider)) {
      try {
        this.doConsentCallback(consentCallback, provider, target);
        return;
      } catch (e) {
        throw e;
      }
    }

    const consent_category = this.getConsentCategoryForProvider(provider);
    const hasOverlay = this.getConsentOverlay(target);
    const providerSettings = this.getProviderSettings(provider)
    let isConsented = false;

    try {
      isConsented = await this.isConsentedToCategory(consent_category);
    } catch (e) {
      throw e;
    }

    if (isConsented) {
      try {
        this.doConsentCallback(consentCallback, provider, target);
        return;
      } catch (e) {
        throw e;
      }
    } else {
      // If the overlay is already open, do nothing.
      if (hasOverlay) {
        return;
      }

      if (!target.getAttribute("id")) {
        // Add an id attribute for use by `getConsentOverlay()`.
        const id = this.genUID("otsuka-pcm-overlay-id-");
        target.setAttribute("id", id);
      }

      const overlayConsentCallback = () => {
        this.doConsentCallback(consentCallback, provider, target);
      };

      const overlay = this.createConsentOverlay({
        target: target,
        provider: provider,
        consentCallback: overlayConsentCallback,
        cancelCallback: cancelCallback,
        withCloseButton: withCloseButton,
      });

      // Remove all previously open modal before open new.
      const previousOverlay = document.querySelector(".otsuka-pcm-consent-overlay")
      if (previousOverlay) {
        previousOverlay.remove();
      }
      if (providerSettings.modal.description !== '') {
        target.append(overlay);
      }

      // Load content if user accept it from OneTrust banner.
      const overlayClass = this.overlayClassname;
      // Copy scope of the current execution.
      let _this = this;
      _this.callback = consentCallback;
      _this.provider = provider;
      _this.target = target;
      OneTrust.OnConsentChanged(function () {
        let isConsentedPromise = OtsukaPCM.isConsentedToCategory(consent_category);
        isConsentedPromise.then(isConsentedResult => {
          const hasOverlay = OtsukaPCM.getConsentOverlay(_this.target);
          if (isConsentedResult && hasOverlay) {
            try {
              OtsukaPCM.doConsentCallback(_this.callback, _this.provider, _this.target);
              return;
            } catch (e) {
              throw e;
            }
          }
        });
      });
      // Set up external link dialog.
      if (typeof Drupal.behaviors.externalLinkPopup !== undefined) {
        document.querySelectorAll('.otsuka-pcm-consent-overlay a').forEach((link) => {
          if (link.classList.contains('external-link-popup-disabled')) return;
          if (!Drupal.behaviors.externalLinkPopup) return;
          const domain = Drupal.behaviors.externalLinkPopup.getDomain(link.getAttribute('href'));
          if (!domain) return;
          link.addEventListener('click', function (e) {
            for (var i = 0; i < drupalSettings.external_link_popup.popups.length; i++) {
              popup = drupalSettings.external_link_popup.popups[i];
              if (popup.domains !== '*' && !Drupal.behaviors.externalLinkPopup.inDomain(domain, popup.domains.split(/\s*,\s*|\s+/))) {
                continue;
              }
              e.preventDefault();
              return Drupal.behaviors.externalLinkPopup.openDialog(
                link,
                popup,
                domain
              );
            }
          });
        });
      }
      // Announce modal description
      Drupal.announce(providerSettings.modal.description);
    }
  },

  /**
   * Execute a consentCallback from doConsentModal().
   * @param {function} consentCallback
   * @param {string} provider
   * @param {Element} target
   */
  doConsentCallback: async function (consentCallback, provider, target) {
    try {
      // Ensure the player API is available.
      await this.loadPlayerAPI(provider);
    } catch (e) {
      throw e;
    }
    // In case the overlay was already shown in this modal, hide it.
    this.removeConsentOverlay(target);
    consentCallback && consentCallback();
  },

  /**
   * Initializes the target iframe for use with consent management.
   * @param {Element} iframe The iframe Element of the media item that will be
   *   consent-managed. The consent overlay will be placed at the location of
   *   this element.
   * @param {object} passedOptions An object containing additional options.
   * @returns {void}
   */
  initIframe: async function (iframe, passedOptions = {}) {
    const options = {
      showModal: false,
      withCloseButton: true,
      withDefaultOverlay: true,
      displayErrorModal: true,
      ...passedOptions,
    };
    const { domain, video_id, provider } = this.isManagedIframe(iframe);
    if (!domain || !video_id) {
      return;
    }

    if (!this.isProviderEnabled(provider)) {
      return;
    }

    if (!iframe.id) {
      iframe.id = this.genUID("otsk-player-");
    }

    // Hide the iframe.
    iframe.style.display = "none";

    // Make the video frame responsive, based on 16:9 ratio.
    this.makeResponsiveIframe(iframe);

    // Load the video thumbnail.
    const img = await this.getThumbnailImgForIframe(iframe);
    // Append img as a sibling of the iframe.
    iframe.parentNode.append(img);

    // Get custom thumbnail overlay image set in the module settings.
    const imgOverlay = this.getOverlayImage(provider);
    if (imgOverlay) {
      // Display custom thumbnail overlay image.
      imgOverlay.classList.add(this.thumbnailOverlayClassname);
      iframe.parentNode.classList.add(this.thumbnailOverlayCustomClassname);
      iframe.parentNode.append(imgOverlay);
    } else if (options.withDefaultOverlay) {
      // Display default thumbnail overlay image.
      iframe.parentNode.classList.add(this.thumbnailOverlayDefaultClassname);
      this.videoOverlayResizeObserver.observe(iframe.parentNode);
    }

    const imgClickListener = async () => {
      const target = iframe.parentNode;
      try {
        const consentCallback = async () => {
          target.classList.remove(
            this.thumbnailOverlayCustomClassname,
            this.thumbnailOverlayDefaultClassname
          );
          imgOverlay && imgOverlay.remove();
          img.remove();
          this.playIframeVideo(iframe);
          // Dispatch loadPlayer event for react_player.
          const e = new Event("loadPlayer");
          e.id = target.getAttribute("id");
          document.dispatchEvent(e);
        };
        await this.doConsentModal({
          target: target,
          provider: provider,
          consentCallback: consentCallback,
          ...options,
        });
      } catch (e) {
        this.printError(`initIframe: caught error: ${e}`);
        if (options.displayErrorModal) {
          this.doErrorModal({
            target: target,
            ...options,
          });
        }
      }
    };

    // Listen for keyboard events.
    const imgKeyupListener = async (e) => {
      if ("Enter" === e.key) {
        e.target.click();
      }
    };

    img.addEventListener("click", imgClickListener);
    img.addEventListener("keydown", imgKeyupListener);
    img.setAttribute("role", "button");
    img.setAttribute("tabindex", "0");

    if (options.showModal) {
      img.click();
    }
  },

  /**
   * Initializes the target React Player wrapper Element for use with consent
   * management.
   * @param {Element} reactPlayerWrapper The target DOM Element of the react
   *   player wrapper that is being consent-managed. The consent overlay will
   *   be placed inside this element.
   * @param {object} passedOptions An object containing additional options.
   * @returns {void}
   */
  initReactPlayer: async function (reactPlayerWrapper, passedOptions = {}) {
    const options = {
      showModal: false,
      withCloseButton: true,
      withDefaultOverlay: true,
      displayErrorModal: true,
      ...passedOptions,
    };

    const playerId = reactPlayerWrapper.parentNode.id;
    const video = drupalSettings.react_videos?.videos_list[playerId];

    // If a player already exists, do nothing.
    const player = reactPlayerWrapper.querySelector(".react-player");
    if (player) {
      return;
    }

    // If the playerId doesn't exist in drupalSettings, do nothing.
    if (!video) {
      return;
    }

    // If it's not a managed video src, do nothing.
    const { domain, video_id, provider } = this.isManagedSrc(video.url);
    if (!domain || !video_id) {
      return;
    }

    const preview = reactPlayerWrapper.querySelector(".react-player-preview");

    // Get custom thumbnail overlay image set in the module settings.
    const imgOverlay = this.getOverlayImage(provider);
    if (imgOverlay) {
      // Display custom thumbnail overlay image.
      imgOverlay.classList.add(this.thumbnailOverlayClassname);
      reactPlayerWrapper.classList.add(this.thumbnailOverlayCustomClassname);
      reactPlayerWrapper.append(imgOverlay);
    } else if (options.withDefaultOverlay) {
      // Display default thumbnail overlay image.
      reactPlayerWrapper.classList.add(this.thumbnailOverlayDefaultClassname);
      this.videoOverlayResizeObserver.observe(reactPlayerWrapper);
    }

    const previewClickListener = async () => {
      const target = reactPlayerWrapper;
      try {
        const consentCallback = () => {
          target.classList.remove(
            this.thumbnailOverlayCustomClassname,
            this.thumbnailOverlayDefaultClassname
          );
          imgOverlay && imgOverlay.remove();

          // Dispatch loadPlayer event for react_player.
          const e = new Event("loadPlayer");
          e.id = target.getAttribute("id");
          document.dispatchEvent(e);
        };
        await this.doConsentModal({
          target: target,
          provider: provider,
          consentCallback: consentCallback,
          ...options,
        });
      } catch (e) {
        this.printError(`initReactPlayer: caught error: ${e}`);
        if (options.displayErrorModal) {
          this.doErrorModal({
            target: target,
            ...options,
          });
        }
      }
    };

    // Listen for keyboard events.
    const previewKeyupListener = async (e) => {
      if ("Enter" === e.key) {
        e.target.click();
      }
    };

    preview.addEventListener("click", previewClickListener);
    preview.addEventListener("keydown", previewKeyupListener);
    preview.setAttribute("role", "button");
    preview.setAttribute("tabindex", "0");

    if (options.showModal) {
      preview.click();
    }
  },

  /**
   * Initializes the target script Element for use with consent management.
   * Example: <script
   * src="https://www.buzzsprout.com/1324951.js?container_id=buzzsprout-large-player&amp;player=large"
   * type="text/javascript" charset="utf-8"></script>
   * @param {Element} script The target script Element of the podcast player
   *   that is being consent-managed. The consent overlay will be placed inside
   *   the Element referred to by this script's `container_id` query parameter.
   * @param {object} passedOptions An object containing additional options.
   */
  initBuzzsproutScript: async function (script, passedOptions = {}) {
    const options = {
      showModal: true,
      withCloseButton: true,
      withDefaultOverlay: true,
      displayErrorModal: true,
      ...passedOptions,
    };
    const dataSrc = script.getAttribute("data-src");
    const { provider } = this.isManagedSrc(dataSrc);

    // If it's not a Buzzsprout script, do nothing.
    if (provider !== this.providers.BUZZSPROUT) {
      this.throwError("initBuzzsproutScript: invalid script element");
      return;
    }

    const consentCategoryId = this.getConsentCategoryForProvider(provider);
    let isConsented = false;

    try {
      isConsented = await this.isConsentedToCategory(consentCategoryId);
    } catch (e) {
      // We'll display an error below in `doConsentModal` so don't worry about it here.
    }

    // Get target element (container_id) from script params.
    // e.g. container_id=buzzsprout-large-player
    const url = new URL(dataSrc);
    const container_id = url.searchParams.get("container_id");
    const buzzsproutWrapper = document.getElementById(container_id);

    // If the user is already consented, insert the script and return.
    if (isConsented) {
      this.insertScript(script);

      // Dispatch loadPlayerBP event for Buzzsprout.
      const target = buzzsproutWrapper;
      const e = new Event("loadPlayerBP");
      e.id = target.getAttribute("id");
      document.dispatchEvent(e);

      return;
    }

    // Get custom thumbnail overlay image set in the module settings.
    const imgOverlay = this.getOverlayImage(provider);
    if (imgOverlay) {
      // Display custom thumbnail overlay image.
      buzzsproutWrapper.classList.add(
        this.buzzsproutPlaceholderCustomClassname
      );
      buzzsproutWrapper.append(imgOverlay);
    } else if (options.withDefaultOverlay) {
      // Display default thumbnail overlay image.
      // buzzsproutWrapper.style.position = "relative";
      buzzsproutWrapper.classList.add(
        this.buzzsproutPlaceholderDefaultClassname
      );
    }

    const wrapperClickListener = async () => {
      const target = buzzsproutWrapper;
      try {
        const consentCallback = () => {
          target.classList.remove(
            this.buzzsproutPlaceholderCustomClassname,
            this.buzzsproutPlaceholderDefaultClassname
          );
          imgOverlay && imgOverlay.remove();
          this.insertScript(script);

          // Dispatch loadPlayerBP event for Buzzsprout.
          const e = new Event("loadPlayerBP");
          e.id = target.getAttribute("id");
          document.dispatchEvent(e);
        };
        await this.doConsentModal({
          target: target,
          provider: provider,
          consentCallback: consentCallback,
          ...options,
        });
      } catch (e) {
        this.printError(`initBuzzsproutScript: caught error: ${e}`);
        if (options.displayErrorModal) {
          this.doErrorModal({
            target: target,
            ...options,
          });
        }
      }
    };

    // Listen for keyboard events.
    const wrapperKeyupListener = async (e) => {
      if ("Enter" === e.key) {
        e.target.click();
      }
    };

    // Open consent modal in target of script
    buzzsproutWrapper.addEventListener("click", wrapperClickListener);
    buzzsproutWrapper.addEventListener("keydown", wrapperKeyupListener);
    buzzsproutWrapper.setAttribute("role", "button");
    buzzsproutWrapper.setAttribute("tabindex", "0");

    if (options.showModal) {
      buzzsproutWrapper.click();
    }
  },

  /**
   * “Deinitializes” the target script Element that was previously prepared for
   * consent management with `initBuzzsproutScript()`.
   * @param {Element} script The target script Element of the podcast player
   *   that is being consent-managed. The consent overlay will be removed from
   *   the Element referred to by this script's `container_id` query parameter.
   */
  deinitBuzzsproutScript: function (script) {
    const dataSrc = script.getAttribute("data-src");
    const { provider } = this.isManagedSrc(dataSrc);

    // If it's not a Buzzsprout script, do nothing.
    if (provider !== this.providers.BUZZSPROUT) {
      this.throwError("deinitBuzzsproutScript: invalid script element");
      return;
    }

    const url = new URL(dataSrc);
    const container_id = url.searchParams.get("container_id");
    const buzzsproutWrapper = document.getElementById(container_id);
    const imgOverlay = buzzsproutWrapper.querySelector(
      ".otsuka-pcm-img-overlay"
    );
    imgOverlay && imgOverlay.remove();
    buzzsproutWrapper.classList.remove(this.buzzsproutOverlayDefaultClassname);
    this.removeConsentOverlay(buzzsproutWrapper);
  },

  /**
   * Initializes the target script Element for use with consent management.
   * Example: <script type="text/javascript" defer=""
   * src="https://otsuka-jynarque-stage.orbita.cloud:8443/chatbot/v3/chat.js"
   * data-once="cmpInitScript"></script>
   * @param {Element} script The target script Element of the podcast player
   *   that is being consent-managed. The consent overlay will be placed inside
   *   this element’s parent element.
   * @param {object} passedOptions An object containing additional options.
   */
  initOrbitaScript: async function (script, passedOptions = {}) {
    const options = {
      displayErrorModal: false,
      ...passedOptions,
      withCloseButton: true,
    };
    const dataSrc = script.getAttribute("data-src");
    const { provider } = this.isManagedSrc(dataSrc);

    // If it's not an Orbita script, do nothing.
    if (provider !== this.providers.ORBITA) {
      this.throwError("initOrbitaScript: invalid script element");
      return;
    }

    const orbitaSettings = this.getProviderSettings(this.providers.ORBITA);
    const consentCategoryId = this.getConsentCategoryForProvider(provider);
    let isConsented = false;

    try {
      isConsented = await this.isConsentedToCategory(consentCategoryId);
    } catch (e) {
      if (!options.displayErrorModal) {
        throw e;
      }
      // else:
      // We'll display an error below in `doConsentModal` so don't worry about it here.
    }

    // If the user is already consented, insert the script and return.
    if (isConsented) {
      this.insertScript(script);
      return;
    }

    const widget = this.createElementFromText(orbitaSettings.widget.html);
    const styles = this.createElementFromText(
      orbitaSettings.widget.css,
      "style",
      false
    );
    const chatbotWrapper = document.getElementById(
      orbitaSettings.widget.wrapper_id
    );
    chatbotWrapper.appendChild(widget);
    chatbotWrapper.appendChild(styles);

    const widgetClickListener = async () => {
      const target = document.body;
      try {
        // Open consent modal in target of script
        const consentCallback = async () => {
          widget && widget.remove();
          this.insertScript(script);
          await this.awaitOrbitaChatbot();
          const orbitaButton = await this.awaitOrbitaChatButton();
          orbitaButton.click();
        };
        await this.doConsentModal({
          target: target,
          provider: provider,
          consentCallback: consentCallback,
          ...options,
        });
      } catch (e) {
        this.printError(`initOrbitaScript: caught error: ${e}`);
        if (options.displayErrorModal) {
          this.doErrorModal({
            target: target,
            ...options,
          });
        }
      }
    };

    // Listen for keyboard events.
    const widgetKeyupListener = async (e) => {
      if ("Enter" === e.key) {
        e.target.click();
      }
    };

    widget.addEventListener("click", widgetClickListener);
    widget.addEventListener("keydown", widgetKeyupListener);
    widget.setAttribute("role", "button");
    widget.setAttribute("tabindex", "0");
  },

  /**
   * Initializes the target script Element for use with consent management.
   * @param {Element} script The target script Element that is being
   *   consent-managed.
   * @param {object} passedOptions An object containing additional options.
   * @returns {void}
   */
  initScript: async function (script, passedOptions = {}) {
    const options = {
      showModal: true,
      withCloseButton: true,
      ...passedOptions,
    };
    const { provider } = this.isManagedSrc(script.getAttribute("data-src"));

    if (!provider) {
      // Do nothing. Don't throw or print errors since this function may be
      // called en masse on all/many scripts on a page.
      return;
    }

    try {
      switch (provider) {
        case this.providers.BUZZSPROUT:
          await this.initBuzzsproutScript(script, options);
          break;
        case this.providers.ORBITA:
          await this.initOrbitaScript(script, options);
          break;
      }
    } catch (e) {
      throw e;
    }
  },
});
