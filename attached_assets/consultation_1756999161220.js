// consultation.js - hardened client (fixed fetch + real-time polling)
$(document).ready(function () {
  const apiBase =
    (window.CONSULT_CFG && window.CONSULT_CFG.apiBase) ||
    "consultation_api.php";
  const chatContainer = $("#chatContainer");
  const messageInput = $("#studentMessageInput");
  const sendMessageButton = $("#sendMessageButton");
  const quickResponses = $("#quickResponsesArea");
  const typingIndicator = $("#typingIndicator");
  const jumpToLatestBtn = $("#jumpToLatest");
  const userInitials = (window.CONSULT_CFG && window.CONSULT_CFG.userInitials) || 'S';

  // CSRF token is now used for improved security
  const CSRF = (window.CONSULT_CFG && window.CONSULT_CFG.csrf) || "";

  // Use a map to store message IDs for deduplication to handle both student and admin messages
  let appendedMessageIds = new Map();

  let isFetching = false;
  let isSending = false;
  let lastMessageTimestamp = '';

  // Function to show a temporary feedback message
  function showFeedback(message, type = "info", duration = 2500) {
    let box = $("#feedbackMessage");
    if (!box.length)
      box = $('<div id="feedbackMessage" class="feedback-message"></div>').appendTo("body");
    box.text(message).removeClass("info error").addClass(type).addClass("show");
    setTimeout(() => box.removeClass("show"), duration);
  }

  // Sanitize HTML input
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  // Sanitize HTML and convert newlines to <br>
  function escapeAndNl2br(str) {
    return escapeHtml(str).replace(/\n/g, "<br>");
  }

  // Format timestamp for display
  function formatTimestamp(iso) {
    let normalized = iso || "";
    if (normalized.indexOf(" ") >= 0 && normalized.indexOf("T") === -1)
      normalized = normalized.replace(" ", "T");
    const d = new Date(normalized);
    const when = isNaN(d.getTime()) ? new Date() : d;
    return when.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Check if user is scrolled to the bottom of the chat
  function isAtBottom() {
    const threshold = 40;
    return (
      chatContainer.prop("scrollHeight") -
      chatContainer.scrollTop() -
      chatContainer.outerHeight() <
      threshold
    );
  }

  // Render a single message bubble
  function renderMessageHTML(msg) {
    const ts = msg.timestamp || new Date().toISOString();
    const sender = msg.sender_type === "admin" ? "admin" : "student";
    const html = escapeAndNl2br(msg.text || "");
    const formatted = formatTimestamp(ts);
    const avatarContent = sender === "admin" ? "CH" : userInitials;
    const avatarHtml = `<div class="message-avatar"><div class="avatar">${avatarContent}</div></div>`;

    return `
      <div class="message-bubble ${sender}-message" data-id="${escapeHtml(msg.id)}" data-timestamp="${escapeHtml(ts)}">
        ${sender === 'admin' ? avatarHtml : ''}
        <div class="bubble-content new">
          <div class="msg-html">${html}</div>
          <div class="timestamp">${formatted}</div>
        </div>
        ${sender === 'student' ? avatarHtml : ''}
      </div>
    `;
  }

  // Disable form submission on enter
  $(document).on("submit", "form", function (e) {
    e.preventDefault();
    return false;
  });

  // Main function to process and render messages
  function processMessages(messages, isInitialLoad) {
    if (isInitialLoad) {
      chatContainer.empty();
      appendedMessageIds.clear();
    }

    if (messages.length > 0) {
      const wasAtBottom = isAtBottom();
      let frag = "";

      messages.forEach((m) => {
        const messageKey = `${m.sender_type}-${m.id}`;
        if (!appendedMessageIds.has(messageKey)) {
          appendedMessageIds.set(messageKey, m.timestamp);
          frag += renderMessageHTML(m);
          lastMessageTimestamp = m.timestamp;
        }
      });

      if (frag) {
        $(".no-messages").remove();
        chatContainer.append(frag);
        setTimeout(
          () => chatContainer.find(".bubble-content.new").removeClass("new"),
          10
        );

        if (wasAtBottom || isInitialLoad) {
          chatContainer.scrollTop(chatContainer.prop("scrollHeight"));
          jumpToLatestBtn.fadeOut(120);
        } else {
          jumpToLatestBtn.fadeIn(120);
        }
      }
    } else if (isInitialLoad) {
      chatContainer.html('<div class="no-messages">No messages yet.</div>');
    }
  }

  // Function to perform initial load and then start long polling
  function initialLoadAndStartPolling() {
    $.ajax({
      url: apiBase + "?action=fetch_messages",
      method: "GET",
      dataType: "json",
      timeout: 15000,
      success: function(res) {
        if (res.status === "success" && Array.isArray(res.messages)) {
          processMessages(res.messages, true);
        } else if (res.status === "error") {
          console.error("Initial fetch error:", res.message);
        }
        // Always start polling after initial load
        startLongPolling();
      },
      error: function(jq, text, err) {
        console.error("Initial fetch AJAX error:", text, err, jq.responseText);
        // Start polling even if initial fetch fails
        startLongPolling();
      }
    });
  }

  // Main long polling function
  function startLongPolling() {
    if (isFetching) return;
    isFetching = true;

    $.ajax({
      url: apiBase + "?action=poll_messages" + (lastMessageTimestamp ? `&last_timestamp=${encodeURIComponent(lastMessageTimestamp)}` : ''),
      method: "GET",
      dataType: "json",
      timeout: 30000, // Set timeout longer than server's
      success: function (res) {
        isFetching = false;
        if (res.status === "success" && Array.isArray(res.messages)) {
          if (res.messages.length > 0) {
            processMessages(res.messages, false);
          }
        } else if (res.status === "error") {
          console.error("Polling server error:", res.message);
        }
        // Always restart the poll after a successful response
        startLongPolling();
      },
      error: function (jq, text, err) {
        isFetching = false;
        console.error("AJAX polling error:", text, err, jq.responseText);
        // Retry with a delay on error
        setTimeout(startLongPolling, 3000);
      },
    });
  }

  // Initial call to load messages and begin polling
  initialLoadAndStartPolling();

  // Scroll to bottom button functionality
  jumpToLatestBtn.on("click", () => {
    chatContainer.scrollTop(chatContainer.prop("scrollHeight"));
    jumpToLatestBtn.fadeOut(120);
  });

  // Hide scroll to bottom button if user is already at the bottom
  chatContainer.on("scroll", () => {
    if (isAtBottom()) jumpToLatestBtn.fadeOut(120);
    else if (!isAtBottom() && chatContainer.prop("scrollHeight") > chatContainer.outerHeight() * 1.5) {
        jumpToLatestBtn.fadeIn(120);
    }
  });

  // Textarea auto-resize functionality
  function autoresize() {
    this.style.height = "auto";
    const maxHeight = 220;
    let newH = this.scrollHeight;
    if (newH > maxHeight) newH = maxHeight;
    this.style.height = newH + "px";
  }
  messageInput.on("input", autoresize);

  // Typing indicator functionality
  let typingTimer = null;
  messageInput.on("input", function () {
    if (this.value.trim().length > 0) {
      typingIndicator.stop(true, true).fadeIn(100);
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = setTimeout(
        () => typingIndicator.stop(true, true).fadeOut(150),
        1200
      );
    } else typingIndicator.stop(true, true).fadeOut(150);
  });

  // Main function to send a message
  function sendMessage() {
    if (isSending) return;
    let text = messageInput.val().trim();
    if (!text) {
      showFeedback("Message cannot be empty.", "error");
      return;
    }

    isSending = true;
    sendMessageButton
      .prop("disabled", true)
      .html('<i class="fas fa-spinner fa-spin"></i> Sending...');
    messageInput.prop("disabled", true);

    $.ajax({
      url: apiBase + "?action=send_message",
      method: "POST",
      dataType: "json",
      data: { message_text: text, csrf_token: CSRF },
      timeout: 12000,
      success: function (res) {
        if (!res) {
          showFeedback("Empty server response.", "error");
          return;
        }
        if (res.status === "success") {
          messageInput.val("");
          messageInput.css("height", "auto");
        } else if (res.status === "error") {
          showFeedback(
            "Error sending message: " + (res.message || "Unknown"),
            "error"
          );
        }
      },
      error: function (jq, text, err) {
        console.error("AJAX sendMessage error:", text, err, jq.responseText);
        showFeedback("Network/server error while sending.", "error", 4000);
      },
      complete: function () {
        isSending = false;
        sendMessageButton
          .prop("disabled", false)
          .html('<i class="fas fa-paper-plane"></i> Send');
        messageInput.prop("disabled", false).focus();
      },
    });
  }

  // Event listeners for sending messages
  messageInput.on("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  sendMessageButton.on("click", function (e) {
    e.preventDefault();
    sendMessage();
  });

  // Quick responses (long press to auto-send)
  let pressTimer = null;
  let longPressFired = false;
  quickResponses.on(
    "mousedown touchstart",
    ".quick-response-button",
    function () {
      const btn = $(this);
      longPressFired = false;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(function () {
        longPressFired = true;
        const msg = btn.data("message") || btn.text().trim();
        messageInput.val(msg);
        autoresize.call(messageInput[0]);
        sendMessage();
      }, 650);
    }
  );

  quickResponses.on(
    "mouseup mouseleave touchend touchcancel",
    ".quick-response-button",
    function () {
      clearTimeout(pressTimer);
    }
  );

  // Quick responses (single click to fill input)
  quickResponses.on("click", ".quick-response-button", function (ev) {
    if (longPressFired) {
      longPressFired = false;
      ev.preventDefault();
      return;
    }
    const text = $(this).data("message") || $(this).text().trim();
    messageInput.val(text).focus();
    autoresize.call(messageInput[0]);
  });

  console.info("consultation.js fully loaded (long polling).");
});