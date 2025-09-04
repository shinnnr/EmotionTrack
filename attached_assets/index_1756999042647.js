<script>
    let moodLogsDataTable = null;
    let dass21ResultsDataTable = null;
    let pollingInterval = null; 
    let currentSelectedUserId = null;
    let currentSelectedUserName = null;
    let lastMessageTimestamp = null; // Track the timestamp of the last message

    function showMessageBox(type, message) {
        const container = document.getElementById('messageBoxContainer');
        if (!container) {
            console.error("Message box container not found.");
            return;
        }

        container.innerHTML = '';
        const messageBox = document.createElement('div');
        messageBox.classList.add('message-box', `message-box-${type}`);
        messageBox.innerHTML = `
            <p>${message}</p>
            <span class="close-message-box">&times;</span>
        `;
        container.appendChild(messageBox);
        setTimeout(() => { messageBox.classList.add('show'); }, 50);
        setTimeout(() => {
            messageBox.classList.remove('show');
            messageBox.addEventListener('transitionend', () => { container.innerHTML = ''; }, { once: true });
        }, 5000);
        messageBox.querySelector('.close-message-box').addEventListener('click', () => {
            messageBox.classList.remove('show');
            messageBox.addEventListener('transitionend', () => { container.innerHTML = ''; }, { once: true });
        });
    }

    // Renders a single message bubble and updates lastMessageTimestamp
    function renderMessage(message) {
        const senderClass = message.sender_role === 'admin' ? 'admin-message' : 'student-message';
        const bubble = `
            <div class="message-bubble ${senderClass}">
                <div class="bubble-content">
                    <p>${message.message_text}</p>
                    <span class="timestamp">${message.timestamp}</span>
                </div>
            </div>
        `;
        $("#chatContainerAdmin").append(bubble);
        lastMessageTimestamp = message.timestamp; // update last timestamp
    }

    // Poll new messages
    function pollForNewMessages() {
        if (!currentSelectedUserId) return;

        const url = `index.php?action=getNewMessages&user_id=${currentSelectedUserId}&last_timestamp=${lastMessageTimestamp}&_=${new Date().getTime()}`;

        $.ajax({
            url: url,
            method: 'GET',
            dataType: 'json',
            success: function (data) {
                if (data && data.length > 0) {
                    data.forEach(renderMessage);
                    const chatContainer = $("#chatContainerAdmin");
                    chatContainer.scrollTop(chatContainer.prop("scrollHeight"));
                }
            },
            error: function (xhr, status, error) {
                console.error("Polling error:", status, error, xhr.responseText);
            }
        });
    }

    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(pollForNewMessages, 3000);
    }

    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    // =============================
    // NEW: unread badges logic
    // =============================
    function refreshUnreadBadges() {
        $.ajax({
            url: 'index.php?action=fetchUnreadCounts',
            method: 'GET',
            dataType: 'json',
            success: function(map) {
                $(".student-item").each(function() {
                    const uid = $(this).data('userId');
                    const count = map[uid] ? parseInt(map[uid], 10) : 0;
                    const badge = $(this).find('.unread-badge');
                    if (count > 0) {
                        badge.text(count).show();
                    } else {
                        badge.text('').hide();
                    }
                });
            }
        });
    }

    // Refresh badges every 5s
    setInterval(refreshUnreadBadges, 5000);

    $(document).ready(function () {
        refreshUnreadBadges(); // first run

        <?php if ($status_message): ?>
            showMessageBox('<?php echo htmlspecialchars($status_message['type']); ?>', '<?php echo htmlspecialchars($status_message['text']); ?>');
        <?php endif; ?>

        function fetchSuggestedResponses(userId) {
            const area = $("#suggestedResponsesArea");
            area.empty();
            area.html('<p class="no-suggested-responses"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</p>');

            $.ajax({
                url: 'index.php?action=getSuggestedResponses&user_id=' + userId,
                method: 'GET',
                dataType: 'json',
                success: function (data) {
                    area.empty();
                    if (data.error) {
                        area.html('<p class="no-suggested-responses">Error fetching suggested responses.</p>');
                    } else if (data.length === 0) {
                        area.html('<p class="no-suggested-responses">No specific suggestions found. Please type your own.</p>');
                    } else {
                        data.forEach(response => {
                            const button = $('<button class="suggested-response-button">').text(response);
                            button.on('click', function () {
                                $('#adminMessageInput').val(response).focus();
                            });
                            area.append(button);
                        });
                    }
                },
                error: function () {
                    area.empty();
                    area.html('<p class="no-suggested-responses">Failed to load suggestions.</p>');
                }
            });
        }

        function loadChatHistory(userId) {
            const chatContainer = $("#chatContainerAdmin");
            chatContainer.html('<p class="no-student-selected"><i class="fas fa-spinner fa-spin"></i> Loading chat history...</p>');
            
            lastMessageTimestamp = '1970-01-01 00:00:00';
            stopPolling();

            $.ajax({
                url: 'index.php?action=getChatHistory&user_id=' + userId,
                method: 'GET',
                dataType: 'json',
                success: function (data) {
                    chatContainer.empty();
                    if (data.length > 0) {
                        data.forEach(renderMessage);
                        chatContainer.scrollTop(chatContainer.prop("scrollHeight"));
                    } else {
                        chatContainer.html('<p class="no-student-selected">No chat history yet.</p>');
                    }
                    startPolling();
                },
                error: function () {
                    chatContainer.html('<p class="no-student-selected" style="color: red;">Error loading chat history.</p>');
                }
            });
        }

        // Student click handler
        $(document).on('click', '.student-item', function () {
            $('.student-item').removeClass('active');
            $(this).addClass('active');

            currentSelectedUserId = $(this).data('userId');
            currentSelectedUserName = $(this).data('username');

            $('#currentStudentName').text(currentSelectedUserName);
            $('#viewLogsButton').show();
            $('#adminMessageInput').prop('disabled', false);
            $('#sendMessageButton').prop('disabled', false);

            // reset unread badge
            $(this).find('.unread-badge').text('').hide();
            $.ajax({ url: 'index.php', method: 'POST', data: { action: 'resetUnreadCount', user_id: currentSelectedUserId } });

            loadChatHistory(currentSelectedUserId);
            fetchSuggestedResponses(currentSelectedUserId);
        });

        // Search
        $('#studentSearchInput').on('keyup', function () {
            const searchTerm = $(this).val().toLowerCase();
            $('.student-item').each(function () {
                const studentName = $(this).data('username').toLowerCase();
                $(this).toggle(studentName.includes(searchTerm));
            });
            $('.strand-item, .section-item').each(function () {
                const hasVisibleStudents = $(this).find('.student-item:visible').length > 0;
                $(this).toggle(hasVisibleStudents);
            });
        });

        // Toggle sections
        $(document).on('click', '.strand-button', function() {
            $(this).parent().find('.section-list').first().slideToggle();
            $(this).find('.fas').toggleClass('fa-chevron-right fa-chevron-down');
        });
        $(document).on('click', '.section-button', function() {
            $(this).parent().find('.students-in-section').first().slideToggle();
            $(this).find('.fas').toggleClass('fa-chevron-right fa-chevron-down');
        });

        // Logs modal
        $('#viewLogsButton').on('click', function() {
            if (currentSelectedUserId) {
                loadLogs(currentSelectedUserId, currentSelectedUserName);
            }
        });

        function closeLogsModal() {
            $("#moodLogsModal").removeClass("is-active");
            if (moodLogsDataTable) {
                moodLogsDataTable.destroy();
                moodLogsDataTable = null;
            }
            if (dass21ResultsDataTable) {
                dass21ResultsDataTable.destroy();
                dass21ResultsDataTable = null;
            }
        }
        $('.logs-modal-close').on('click', closeLogsModal);

        // Logout modal
        $('#logoutConfirmButton').on('click', function(e) {
            e.preventDefault();
            $('#logoutModal').addClass('is-active');
        });
        $('#confirmLogout').on('click', function() { window.location.href = '../logout.php'; });
        $('#cancelLogout, .logout-modal-close').on('click', function() { $('#logoutModal').removeClass('is-active'); });

        // Send message
        $("#sendMessageButton").on("click", function () {
            const message = $("#adminMessageInput").val().trim();
            if (message === "" || !currentSelectedUserId) return;
            
            $("#adminMessageInput").prop('disabled', true);
            $("#sendMessageButton").prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Sending...');

            $.ajax({
                url: 'index.php?action=sendMessage',
                method: 'POST',
                data: { user_id: currentSelectedUserId, message: message },
                dataType: 'json',
                success: function (response) {
                    if (response.status === 'success') {
                        $("#adminMessageInput").val('');
                    } else {
                        showMessageBox('error', 'Failed to send message.');
                    }
                },
                error: function () {
                    showMessageBox('error', 'Failed to send message.');
                },
                complete: function() {
                    $("#adminMessageInput").prop('disabled', false);
                    $("#sendMessageButton").prop('disabled', false).html('<i class="fas fa-paper-plane"></i> Send');
                }
            });
        });

        $("#adminMessageInput").on("keydown", function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                $("#sendMessageButton").click();
            }
        });

        // Load logs with fixed DataTables init
        function loadLogs(userId, studentName) {
            closeLogsModal();
            $("#moodLogsBody").empty();
            $("#dass21ResultsBody").empty();
            $("#logsStudentNameModal").text(studentName);

            $("#moodLogsBody").html("<tr><td colspan='8' style='text-align: center;'><i class='fas fa-spinner fa-spin'></i> Loading...</td></tr>");
            $("#dass21ResultsBody").html("<tr><td colspan='4' style='text-align: center;'><i class='fas fa-spinner fa-spin'></i> Loading...</td></tr>");

            let moodLogsLoaded = false;
            let dassResultsLoaded = false;

            function checkAndShowModal() {
                if (moodLogsLoaded && dassResultsLoaded) {
                    $("#moodLogsModal").addClass("is-active");
                }
            }

            $.ajax({
                url: 'index.php?action=getMoodLogs&user_id=' + userId,
                method: 'GET',
                success: function (data) {
                    if (moodLogsDataTable) {
                        moodLogsDataTable.destroy();
                        moodLogsDataTable = null;
                    }
                    $("#moodLogsBody").empty();
                    if (data.length > 0) {
                        data.forEach(log => {
                            const row = `<tr>
                                <td>${log.log_id}</td>
                                <td>${log.emotion}</td>
                                <td>${log.sleep_hours}</td>
                                <td>${log.energy_level}</td>
                                <td>${log.triggers || '-'}</td>
                                <td>${log.coping_mechanism || '-'}</td>
                                <td>${log.gratitude_entry || '-'}</td>
                                <td>${log.log_date}</td>
                            </tr>`;
                            $("#moodLogsBody").append(row);
                        });
                    } else {
                        $("#moodLogsBody").html("<tr><td colspan='8'>No mood logs found.</td></tr>");
                    }
                    moodLogsLoaded = true;
                    checkAndShowModal();
                },
                error: function () {
                    $("#moodLogsBody").html("<tr><td colspan='8' style='color: red;'>Failed to load mood logs.</td></tr>");
                    moodLogsLoaded = true;
                    checkAndShowModal();
                },
                complete: function() {
                    if (moodLogsLoaded) {
                        moodLogsDataTable = $('#moodLogsTable').DataTable({
                            destroy: true, // ✅ fix reinit issue
                            paging: true,
                            ordering: true,
                            info: true,
                            searching: true,
                            pageLength: 5
                        });
                    }
                }
            });

            $.ajax({
                url: 'index.php?action=getDass21Results&user_id=' + userId,
                method: 'GET',
                success: function (data) {
                    if (dass21ResultsDataTable) {
                        dass21ResultsDataTable.destroy();
                        dass21ResultsDataTable = null;
                    }
                    $("#dass21ResultsBody").empty();
                    if (data.length > 0) {
                        data.forEach(result => {
                            const row = `<tr>
                                <td>${result.created_at}</td>
                                <td>${result.depression_severity} (${result.depression_score})</td>
                                <td>${result.anxiety_severity} (${result.anxiety_score})</td>
                                <td>${result.stress_severity} (${result.stress_score})</td>
                            </tr>`;
                            $("#dass21ResultsBody").append(row);
                        });
                    } else {
                        $("#dass21ResultsBody").html("<tr><td colspan='4'>No results found.</td></tr>");
                    }
                    dassResultsLoaded = true;
                    checkAndShowModal();
                },
                error: function () {
                    $("#dass21ResultsBody").html("<tr><td colspan='4' style='color: red;'>Failed to load results.</td></tr>");
                    dassResultsLoaded = true;
                    checkAndShowModal();
                },
                complete: function() {
                    if (dassResultsLoaded) {
                        dass21ResultsDataTable = $('#dass21ResultsTable').DataTable({
                            destroy: true, // ✅ fix reinit issue
                            paging: true,
                            ordering: true,
                            info: true,
                            searching: true,
                            pageLength: 5
                        });
                    }
                }
            });
        }
    });
</script>
