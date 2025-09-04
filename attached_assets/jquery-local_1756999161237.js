// Minimal jQuery-like library for basic functionality
(function(global) {
    function $(selector) {
        if (typeof selector === 'function') {
            // Document ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', selector);
            } else {
                selector();
            }
            return;
        }
        
        return new $Element(selector);
    }
    
    function $Element(selector) {
        if (typeof selector === 'string') {
            this.elements = document.querySelectorAll(selector);
        } else if (selector.nodeType) {
            this.elements = [selector];
        } else {
            this.elements = selector;
        }
        this.length = this.elements.length;
    }
    
    $Element.prototype = {
        each: function(callback) {
            for (let i = 0; i < this.elements.length; i++) {
                callback.call(this.elements[i], i, this.elements[i]);
            }
            return this;
        },
        
        on: function(event, callback) {
            return this.each(function() {
                this.addEventListener(event, callback);
            });
        },
        
        click: function(callback) {
            return this.on('click', callback);
        },
        
        val: function(value) {
            if (value !== undefined) {
                return this.each(function() {
                    this.value = value;
                });
            }
            return this.elements[0] ? this.elements[0].value : '';
        },
        
        text: function(text) {
            if (text !== undefined) {
                return this.each(function() {
                    this.textContent = text;
                });
            }
            return this.elements[0] ? this.elements[0].textContent : '';
        },
        
        html: function(html) {
            if (html !== undefined) {
                return this.each(function() {
                    this.innerHTML = html;
                });
            }
            return this.elements[0] ? this.elements[0].innerHTML : '';
        },
        
        append: function(content) {
            return this.each(function() {
                if (typeof content === 'string') {
                    this.insertAdjacentHTML('beforeend', content);
                } else {
                    this.appendChild(content);
                }
            });
        },
        
        empty: function() {
            return this.each(function() {
                this.innerHTML = '';
            });
        },
        
        show: function() {
            return this.each(function() {
                this.style.display = '';
            });
        },
        
        hide: function() {
            return this.each(function() {
                this.style.display = 'none';
            });
        },
        
        fadeIn: function(duration = 300) {
            return this.each(function() {
                this.style.display = '';
                this.style.opacity = '0';
                this.style.transition = `opacity ${duration}ms`;
                setTimeout(() => this.style.opacity = '1', 10);
            });
        },
        
        fadeOut: function(duration = 300) {
            return this.each(function() {
                this.style.transition = `opacity ${duration}ms`;
                this.style.opacity = '0';
                setTimeout(() => this.style.display = 'none', duration);
            });
        },
        
        prop: function(prop, value) {
            if (value !== undefined) {
                return this.each(function() {
                    this[prop] = value;
                });
            }
            return this.elements[0] ? this.elements[0][prop] : undefined;
        },
        
        scrollTop: function(value) {
            if (value !== undefined) {
                return this.each(function() {
                    this.scrollTop = value;
                });
            }
            return this.elements[0] ? this.elements[0].scrollTop : 0;
        }
    };
    
    // AJAX functionality
    $.ajax = function(options) {
        const xhr = new XMLHttpRequest();
        const method = options.method || options.type || 'GET';
        const url = options.url;
        const data = options.data;
        
        xhr.open(method, url);
        
        if (options.dataType === 'json') {
            xhr.setRequestHeader('Accept', 'application/json');
        }
        
        if (method === 'POST' && data) {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        
        xhr.onload = function() {
            let response = xhr.responseText;
            if (options.dataType === 'json') {
                try {
                    response = JSON.parse(response);
                } catch (e) {
                    if (options.error) options.error(xhr, 'parsererror', e);
                    return;
                }
            }
            
            if (xhr.status >= 200 && xhr.status < 300) {
                if (options.success) options.success(response, 'success', xhr);
            } else {
                if (options.error) options.error(xhr, 'error', '');
            }
        };
        
        xhr.onerror = function() {
            if (options.error) options.error(xhr, 'error', '');
        };
        
        xhr.ontimeout = function() {
            if (options.error) options.error(xhr, 'timeout', '');
        };
        
        if (options.timeout) {
            xhr.timeout = options.timeout;
        }
        
        let sendData = null;
        if (data) {
            if (typeof data === 'object') {
                sendData = Object.keys(data).map(key => 
                    encodeURIComponent(key) + '=' + encodeURIComponent(data[key])
                ).join('&');
            } else {
                sendData = data;
            }
        }
        
        xhr.send(sendData);
        
        return xhr;
    };
    
    global.$ = $;
})(window);