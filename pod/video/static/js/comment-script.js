let base_url = window.location.href.replace("/video/", "/comment/");
let base_vote_url = base_url.replace('comment', 'comment/vote');
let base_delete_url = base_url.replace('comment', 'comment/del');
let all_comment = null;
const lang_btn = document.querySelector(".btn-lang.btn-lang-active");
const comment_label = document.querySelector('.comment_label');
// Loader Element
const loader = document.querySelector(".comment_content > .lds-ring");
let VOTED_COMMENTS = [];
const COLORS = [
    "rgb(15,166,2)",
    "sienna",
    "#f44040",
    "teal",
    "darkorchid",
    "orange",
    "yellowgreen",
    "steelblue",
    "darkgray",
]
const LANG = lang_btn ? lang_btn.textContent.trim() : "fr";
const ACTION_COMMENT = {
    comment_to_delete: null
}
if (!is_authenticated)
    document.querySelector(".comment_counter_container").style.margin = "2em 0";

class AlertMessage extends HTMLElement {
    constructor(message, alert_class = "alert_success") {
        super();
        this.setAttribute('class', "alert " + `alert_${alert_class}`);
        let html = document.createElement('DIV');
        html.setAttribute("class", "alert_content");
        let content = document.createElement('DIV');
        content.setAttribute('class', 'alert_message');
        content.textContent = message;
        html.appendChild(content);
        this.appendChild(html);
    }
    connectedCallback() {
        super.connectedCallback && super.connectedCallback();
        window.setTimeout(() => {
            this.classList.add('alert_close');
            window.setTimeout(() => {
                this.parentElement.removeChild(this);
            }, 1000);
        }, 3000);
    }
}
customElements.define("alert-message", AlertMessage);

class ConfirmModal extends HTMLElement {
    constructor(title = null, message = null, delete_text = null, cancel_text = null) {
        super();
        title = title ? title : this.getAttribute('confirm_title');
        message = message ? message : this.getAttribute("message");
        delete_text = delete_text ? delete_text : this.getAttribute("delete_text");
        cancel_text = cancel_text ? cancel_text : this.getAttribute("cancel_text");

        let modal = `
        <div class="confirm_delete">
            <div class="confirm_delete_container">
		<div class="confirm_title" ><h4>${title}</h4></div>
                <div class="content">
                    ${message}
                </div>
                <div class="actions">
                </div>
            </div>
        </div>
        `;
        let delete_btn = document.createElement("BUTTON");
        delete_btn.setAttribute("class", "delete");
        delete_btn.innerHTML = delete_text ? delete_text : gettext("Delete");

        delete_btn.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelector("#custom_element_confirm_modal .confirm_delete").classList.remove("show");
            // Delete comment
            delete_comment(ACTION_COMMENT.comment_to_delete);
            ACTION_COMMENT.comment_to_delete = null;
        });
        let cancel_btn = document.createElement("BUTTON");
        cancel_btn.setAttribute("class", "cancel");
        cancel_btn.innerHTML = cancel_text ? cancel_text : gettext("Cancel");
        cancel_btn.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelector("#custom_element_confirm_modal .confirm_delete").classList.remove("show");
            ACTION_COMMENT.comment_to_delete = null;
        });
        this.innerHTML = modal;
        this.querySelector(".actions").appendChild(delete_btn);
        this.querySelector(".actions").appendChild(cancel_btn);
    }
}
customElements.define("confirm-modal", ConfirmModal);

class CommentSince extends HTMLElement {
    constructor(since) {
        super();
        since = this.getAttribute("since") ? this.getAttribute("since") : since;
        since = typeof (since) === "string" ? new Date(since) : since;
        let date_since = moment(since).locale(LANG).fromNow();
        let div = document.createElement("DIV");
        div.setAttribute("class", "comment_since");
        div.innerText = date_since;
        this.appendChild(div);
        window.setInterval(() => {
            date_since = moment(since).locale(LANG).fromNow();
            div.innerText = date_since;
        }, 60000);
    }
}
customElements.define("comment-since", CommentSince);
class Comment extends HTMLElement {
    constructor(owner, content, likes, added_since, id, is_parent = null, is_comment_owner = false) {
        super();
        this.setAttribute("class", "comment_element");
        this.setAttribute("id", id);
        let comment = document.createElement("DIV");
        comment.setAttribute("class", "comment");
        let comment_container = document.createElement("DIV");
        comment_container.setAttribute("class", "comment_container");
        let comment_content = document.createElement('div');
        comment_content.setAttribute('class', 'comment_content');
        comment_content.innerHTML = `
            <div class="comment_content_header inline_flex_space">
                <h1 class="user_name">${owner}</h1>
		<comment-since since=${added_since.toISOString()}></comment-since>
            </div>
            <div class="comment_content_body">
            </div>
            <div class="comment_content_footer">
                <div class="actions inline_flex_space"></div>
                <div class="form" data-comment="${id}"></div>
            </div>
        `;
        comment_container.appendChild(comment_content);
        if (is_parent)
            comment_container.querySelector('.comment_content_body').innerHTML = content;
        else
            comment_container.querySelector('.comment_content_body').appendChild(content);
        let svg_icon = [`<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="star" class="unvoted svg-inline--fa fa-star fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM388.6 312.3l23.7 138.4L288 385.4l-124.3 65.3 23.7-138.4-100.6-98 139-20.2 62.2-126 62.2 126 139 20.2-100.6 98z"></path></svg>`, `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="star" class="voted svg-inline--fa fa-star fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path></svg>`];
        let vote_action = createFooterBtnAction("comment_actions comment_vote_action", "icon comment_vote_icon", gettext("Agree with the comment"), is_authenticated ? svg_icon : '', "comment_vote_btn", `${likes} votes`, id);
        if (is_authenticated) {
            vote_action.addEventListener("click", () => {
                let comment_id = get_comment_attribute(document.getElementById(id));
                vote(comment_id, vote_action);
            });
        }
        comment_container.querySelector(".comment_content_footer .actions").appendChild(vote_action);

        if (user_id) {
            svg_icon = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="comment" class="svg-inline--fa fa-comment fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 32C114.6 32 0 125.1 0 240c0 47.6 19.9 91.2 52.9 126.3C38 405.7 7 439.1 6.5 439.5c-6.6 7-8.4 17.2-4.6 26S14.4 480 24 480c61.5 0 110-25.7 139.1-46.3C192 442.8 223.2 448 256 448c141.4 0 256-93.1 256-208S397.4 32 256 32zm0 368c-26.7 0-53.1-4.1-78.4-12.1l-22.7-7.2-19.5 13.8c-14.3 10.1-33.9 21.4-57.5 29 7.3-12.1 14.4-25.7 19.9-40.2l10.6-28.1-20.6-21.8C69.7 314.1 48 282.2 48 240c0-88.2 93.3-160 208-160s208 71.8 208 160-93.3 160-208 160z"></path></svg>`;
            let response_action = createFooterBtnAction("comment_actions comment_response_action", "icon comment_response_icon", gettext("Reply to comment"), svg_icon, "comment_response_btn", gettext("Reply"));
            response_action.addEventListener("click", function () {
                let target_node = get_node(this, "form");
                target_node.classList.toggle("show");
                this.parentElement.nextElementSibling.querySelector(".new_comment").focus();
            });
            comment_container.querySelector(".comment_content_footer .actions").appendChild(response_action);

            if (is_comment_owner || is_video_owner || is_superuser) {
                svg_icon = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="trash-alt" class="svg-inline--fa fa-trash-alt fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M268 416h24a12 12 0 0 0 12-12V188a12 12 0 0 0-12-12h-24a12 12 0 0 0-12 12v216a12 12 0 0 0 12 12zM432 80h-82.41l-34-56.7A48 48 0 0 0 274.41 0H173.59a48 48 0 0 0-41.16 23.3L98.41 80H16A16 16 0 0 0 0 96v16a16 16 0 0 0 16 16h16v336a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128h16a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16zM171.84 50.91A6 6 0 0 1 177 48h94a6 6 0 0 1 5.15 2.91L293.61 80H154.39zM368 464H80V128h288zm-212-48h24a12 12 0 0 0 12-12V188a12 12 0 0 0-12-12h-24a12 12 0 0 0-12 12v216a12 12 0 0 0 12 12z"></path></svg>`;
                let delete_action = createFooterBtnAction(
                    "comment_actions comment_delete_action",
                    "icon comment_delete_icon",
                    gettext("Remove this comment"),
                    svg_icon,
                    "comment_delete_btn",
                    gettext("Delete"),
                    id
                );
                delete_action.addEventListener("click", () => {
                    // display confirm modal
                    document.querySelector("#custom_element_confirm_modal .confirm_delete").classList.add("show");
                    let el = document.getElementById(id);
                    ACTION_COMMENT.comment_to_delete = el;
                });
                comment_container.querySelector(".comment_content_footer .actions").appendChild(delete_action);
            }
            let add_comment = document.createElement("DIV");
            add_comment.setAttribute("class", "add_comment");
            add_comment.innerHTML = '<textarea class="new_comment" name="new_comment" id="comment" rows="10" placeholder="' + gettext("Add a public comment") + '"></textarea>';
            let new_comment = add_comment.querySelector(".new_comment");
            new_comment.addEventListener("keyup", function (e) {
                if (!((e.ctrlKey && e.keyCode === 13) || (e.shiftKey && e.keyCode === 13)) && e.keyCode === 13) {
                    this.value = "";
                    this.blur();
                }
            });
            new_comment.addEventListener("keydown", function (e) {
                if (
                    (e.ctrlKey && e.keyCode === 13) ||
                    (e.shiftKey && e.keyCode === 13)
                ) {
                    e.preventDefault();
                    this.value = this.value + '\r\n';
                    this.scrollTop = this.scrollHeight;
                }
                else if (e.keyCode === 13) {
                    let child_container = get_node(this, "comments_children_container");
                    if (!child_container.classList.contains("show"))
                        child_container.classList.add("show");
                    if (this.value.trim() !== "") {
                        let comment_parent = get_node(this, "comment_element", "comment_child");
                        add_comment.parentElement.classList.toggle("show");
                        if (!comment_parent.classList.contains("show"))
                            comment_parent.classList.add("show")
                        add_child_comment(this, child_container, comment_parent);
                        this.value = "";
                    }
                }
            });
            comment_container.querySelector(".comment_content_footer .form").appendChild(add_comment);
        }
        if (is_parent) {
            let comment_icon_svg = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="comments" class="svg-inline--fa fa-comments fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M532 386.2c27.5-27.1 44-61.1 44-98.2 0-80-76.5-146.1-176.2-157.9C368.3 72.5 294.3 32 208 32 93.1 32 0 103.6 0 192c0 37 16.5 71 44 98.2-15.3 30.7-37.3 54.5-37.7 54.9-6.3 6.7-8.1 16.5-4.4 25 3.6 8.5 12 14 21.2 14 53.5 0 96.7-20.2 125.2-38.8 9.2 2.1 18.7 3.7 28.4 4.9C208.1 407.6 281.8 448 368 448c20.8 0 40.8-2.4 59.8-6.8C456.3 459.7 499.4 480 553 480c9.2 0 17.5-5.5 21.2-14 3.6-8.5 1.9-18.3-4.4-25-.4-.3-22.5-24.1-37.8-54.8zm-392.8-92.3L122.1 305c-14.1 9.1-28.5 16.3-43.1 21.4 2.7-4.7 5.4-9.7 8-14.8l15.5-31.1L77.7 256C64.2 242.6 48 220.7 48 192c0-60.7 73.3-112 160-112s160 51.3 160 112-73.3 112-160 112c-16.5 0-33-1.9-49-5.6l-19.8-4.5zM498.3 352l-24.7 24.4 15.5 31.1c2.6 5.1 5.3 10.1 8 14.8-14.6-5.1-29-12.3-43.1-21.4l-17.1-11.1-19.9 4.6c-16 3.7-32.5 5.6-49 5.6-54 0-102.2-20.1-131.3-49.7C338 339.5 416 272.9 416 192c0-3.4-.4-6.7-.7-10C479.7 196.5 528 238.8 528 288c0 28.7-16.2 50.6-29.7 64z"></path></svg>`;
            let comment_icon = document.createElement("DIV");
            comment_icon.innerHTML = comment_icon_svg;
            comment_icon.setAttribute("class", "icon comments_icon");
            let children_container = document.createElement("DIV");
            children_container.setAttribute("class", "comments_children_container");
            comment_container.appendChild(children_container);
            comment.appendChild(comment_icon);
            comment.appendChild(comment_container);
            this.appendChild(comment);
        }
        else {
            let comment_icon_svg = `<svg aria-hidden="true" focusable="false" data-prefix="fab" data-icon="replyd" class="svg-inline--fa fa-replyd fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M320 480H128C57.6 480 0 422.4 0 352V160C0 89.6 57.6 32 128 32h192c70.4 0 128 57.6 128 128v192c0 70.4-57.6 128-128 128zM193.4 273.2c-6.1-2-11.6-3.1-16.4-3.1-7.2 0-13.5 1.9-18.9 5.6-5.4 3.7-9.6 9-12.8 15.8h-1.1l-4.2-18.3h-28v138.9h36.1v-89.7c1.5-5.4 4.4-9.8 8.7-13.2 4.3-3.4 9.8-5.1 16.2-5.1 4.6 0 9.8 1 15.6 3.1l4.8-34zm115.2 103.4c-3.2 2.4-7.7 4.8-13.7 7.1-6 2.3-12.8 3.5-20.4 3.5-12.2 0-21.1-3-26.5-8.9-5.5-5.9-8.5-14.7-9-26.4h83.3c.9-4.8 1.6-9.4 2.1-13.9.5-4.4.7-8.6.7-12.5 0-10.7-1.6-19.7-4.7-26.9-3.2-7.2-7.3-13-12.5-17.2-5.2-4.3-11.1-7.3-17.8-9.2-6.7-1.8-13.5-2.8-20.6-2.8-21.1 0-37.5 6.1-49.2 18.3s-17.5 30.5-17.5 55c0 22.8 5.2 40.7 15.6 53.7 10.4 13.1 26.8 19.6 49.2 19.6 10.7 0 20.9-1.5 30.4-4.6 9.5-3.1 17.1-6.8 22.6-11.2l-12-23.6zm-21.8-70.3c3.8 5.4 5.3 13.1 4.6 23.1h-51.7c.9-9.4 3.7-17 8.2-22.6 4.5-5.6 11.5-8.5 21-8.5 8.2-.1 14.1 2.6 17.9 8zm79.9 2.5c4.1 3.9 9.4 5.8 16.1 5.8 7 0 12.6-1.9 16.7-5.8s6.1-9.1 6.1-15.6-2-11.6-6.1-15.4c-4.1-3.8-9.6-5.7-16.7-5.7-6.7 0-12 1.9-16.1 5.7-4.1 3.8-6.1 8.9-6.1 15.4s2 11.7 6.1 15.6zm0 100.5c4.1 3.9 9.4 5.8 16.1 5.8 7 0 12.6-1.9 16.7-5.8s6.1-9.1 6.1-15.6-2-11.6-6.1-15.4c-4.1-3.8-9.6-5.7-16.7-5.7-6.7 0-12 1.9-16.1 5.7-4.1 3.8-6.1 8.9-6.1 15.4 0 6.6 2 11.7 6.1 15.6z"></path></svg>`;
            let comment_icon = document.createElement("DIV");
            comment_icon.innerHTML = comment_icon_svg;
            comment_icon.setAttribute("class", "icon comments_icon");

            // add show children button action
            comment_container.setAttribute("class", "comment_child_container");
            comment_container.prepend(comment_icon)
            comment_container.querySelector(".comment_content").classList.add("comment_content_child");
            this.classList.add("comment_child");
            this.appendChild(comment_container);
        }
    }
}
function createFooterBtnAction(classes, icon_classes, title, svg, span_classes, span_text, comment_id = null) {
    let el = document.createElement("DIV");
    el.setAttribute("class", classes);
    if (comment_id) el.setAttribute("data-comment", comment_id);
    let el_icon = document.createElement("DIV");
    el_icon.setAttribute("class", icon_classes)
    el_icon.setAttribute("title", title)
    if (Array.isArray(svg))
        el_icon.innerHTML = svg.join(" ")
    else
        el_icon.innerHTML = svg
    let el_span = document.createElement("SPAN");
    el_span.setAttribute("class", span_classes);
    el_span.innerHTML = span_text;
    el.appendChild(
        el_icon
    );
    el.appendChild(el_span);
    return el;
}
function hide_or_add_show_children_btn(parent_comment, parent_id, nb_child) {
    let svg_icon_show = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="eye" class="show svg-inline--fa fa-eye fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M288 144a110.94 110.94 0 0 0-31.24 5 55.4 55.4 0 0 1 7.24 27 56 56 0 0 1-56 56 55.4 55.4 0 0 1-27-7.24A111.71 111.71 0 1 0 288 144zm284.52 97.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400c-98.65 0-189.09-55-237.93-144C98.91 167 189.34 112 288 112s189.09 55 237.93 144C477.1 345 386.66 400 288 400z"></path></svg>`
    let svg_icon_hide = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="eye-slash" class="hide svg-inline--fa fa-eye-slash fa-w-20" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path fill="currentColor" d="M634 471L36 3.51A16 16 0 0 0 13.51 6l-10 12.49A16 16 0 0 0 6 41l598 467.49a16 16 0 0 0 22.49-2.49l10-12.49A16 16 0 0 0 634 471zM296.79 146.47l134.79 105.38C429.36 191.91 380.48 144 320 144a112.26 112.26 0 0 0-23.21 2.47zm46.42 219.07L208.42 260.16C210.65 320.09 259.53 368 320 368a113 113 0 0 0 23.21-2.46zM320 112c98.65 0 189.09 55 237.93 144a285.53 285.53 0 0 1-44 60.2l37.74 29.5a333.7 333.7 0 0 0 52.9-75.11 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64c-36.7 0-71.71 7-104.63 18.81l46.41 36.29c18.94-4.3 38.34-7.1 58.22-7.1zm0 288c-98.65 0-189.08-55-237.93-144a285.47 285.47 0 0 1 44.05-60.19l-37.74-29.5a333.6 333.6 0 0 0-52.89 75.1 32.35 32.35 0 0 0 0 29.19C89.72 376.41 197.08 448 320 448c36.7 0 71.71-7.05 104.63-18.81l-46.41-36.28C359.28 397.2 339.89 400 320 400z"></path></svg>`
    let txt = gettext("Answers");
    txt = nb_child ? `${nb_child} ${txt}` : txt;
    let children_action = createFooterBtnAction(
        "comment_actions comment_show_children_action",
        "icon comment_show_children_icon",
        gettext("Show answers"),
        [svg_icon_show, svg_icon_hide],
        "comment_show_children_btn",
        txt
    );
    children_action.addEventListener("click", function () {
        //get_node(this.parentElement, "comment_element", "comment_child").classList.toggle("show");
        parent_comment.classList.toggle("show");
        fetch_comment_children(parent_comment, parent_id);
    });
    if (parent_comment) {
        let children_container = parent_comment.querySelector(".comments_children_container");
        if (!parent_comment.querySelector(".actions .comment_show_children_action") && nb_child > 0) {
            parent_comment.querySelector(".comment_content_footer .actions .comment_vote_action").after(children_action);
        }
        else if (parent_comment.querySelector(".actions .comment_show_children_action") && nb_child === 0) {
            // remove action if exist
            parent_comment.querySelector(".comment_content_footer .actions").removeChild(
                parent_comment.querySelector(".comment_content_footer .actions .comment_show_children_action")
            )
        }
    }
}
customElements.define("comment-element", Comment)

/*******************  Voting for a comment  ********************
 ***************************************************************/
function vote(comment_id, target_html_el) {
    // send request to the server to check if the current user already vote
    let vote_url = base_vote_url + comment_id + "/";
    let btn = target_html_el.querySelector('.comment_vote_btn')
    let data = new FormData();
    data.append('csrfmiddlewaretoken', Cookies.get('csrftoken'));
    fetch(vote_url, {
        method: "POST",
        body: data
    }).then(response => {
        response.json().then(data => {
            if (data.voted === true) {
                VOTED_COMMENTS.push({
                    'comment__id': comment_id,
                });
                btn.innerHTML = parseInt(btn.textContent) + 1 + " votes";
                if (!target_html_el.classList.contains('voted'))
                    target_html_el.classList.add('voted');
            }
            else {
                VOTED_COMMENTS = VOTED_COMMENTS.filter(obj => {
                    obj.comment__id !== comment_id
                })
                btn.innerHTML = parseInt(btn.textContent) - 1 + " votes";
                if (target_html_el.classList.contains('voted'))
                    target_html_el.classList.remove('voted');
            }
        })
    }).catch(error => {
        console.log(error);
    });
}

/****************  Save comment into the server  ****************
 ***************************************************************/
function save_comment(content, date, direct_parent_id = null, top_parent_comment_html = null) {
    let post_url = base_url.replace("comment", "comment/add");
    let top_parent_id = null;
    let data = new FormData();
    if (top_parent_comment_html) {
        top_parent_id = get_comment_attribute(top_parent_comment_html);
        post_url = post_url + top_parent_id + '/';
        data.append('direct_parent', direct_parent_id);
    }
    data.append('content', content);
    data.append('date_added', date);
    data.append('csrfmiddlewaretoken', Cookies.get('csrftoken'));
    fetch(post_url, {
        method: "POST",
        body: data
    }).then(response => {
        if (response.ok) {
            response.json().then(data => {
                let c = {
                    author_name: data.author_name,
                    is_owner: true,
                    content: content,
                    id: data.id,
                    added: date,
                    parent__id: top_parent_id,
                    direct_parent__id: direct_parent_id,
                    nbr_vote: 0,
                }
                if (!top_parent_id) {
                    c.children = [];
                    c.nbr_child = 0;
                    // update all_comment data
                    all_comment = [...all_comment, c];
                }
                else {
                    // update all_comment data
                    all_comment = all_comment.map((comment) => {
                        if (comment.id === top_parent_id) {
                            comment.children = [...comment.children, c];
                            comment.nbr_child = comment.children.length;
                        }
                        return comment;
                    });
                    hide_or_add_show_children_btn(
                        top_parent_comment_html,
                        top_parent_id,
                        get_comment_attribute(top_parent_comment_html, 'children').length
                    );
                }
                set_comments_number()
            });
        }
        else { console.log("Mauvaise réponse du réseau", response); }
    })
        .catch(error => {
            console.log(error)
            console.log(error.message)
        });
}

/****************  Delete Comment  ****************
 ******************************************************/
function deleteWithAnimation(comment, is_child = false) {
    let selector = is_child ? ".comment_child_container" : ".comment";
    comment.querySelector(selector).classList.add('onDelete');
    window.setTimeout(() => {
        comment.parentElement.removeChild(comment);
    }, 999);
}
function delete_comment(comment) {
    let comment_id = get_comment_attribute(comment);
    let is_child = !!get_comment_attribute(comment, 'parent__id');
    let url = base_delete_url + comment_id + '/';
    let data = new FormData();
    data.append('csrfmiddlewaretoken', Cookies.get('csrftoken'));
    fetch(url, {
        method: "POST",
        body: data
    }
    ).then(response => {
        response.json().then(data => {
            if (data.deleted) {
                document.body.appendChild(new AlertMessage(gettext("Comment has been deleted successfully.")));
                let parent_el = null
                if (is_child) {
                    parent_el = get_node(comment, "comment_element", "comment_child");
                    let parent_id = get_comment_attribute(parent_el);
                    delete_comment_child_DOM(comment, parent_id, is_child);
                    let remaining_children = get_comment_attribute(parent_el, 'nbr_child');
                    deleteWithAnimation(comment, is_child = true);
                    hide_or_add_show_children_btn(parent_el, parent_id, remaining_children);
                    update_answer_text(parent_el);
                    set_comments_number();
                    return;
                }
                all_comment = all_comment.filter(c => c.id != data.comment_deleted);
                deleteWithAnimation(comment, is_child = false);
                set_comments_number();
            }
            else
                document.body.appendChild(new AlertMessage(data.message));
        });
    }).catch(error => {
        console.log(error);
        console.log(error.message);
    })
}

function delete_comment_child_DOM(comment, comment_top_parent_id, is_child) {
    if (is_child) {
        let comment_id = get_comment_attribute(comment);
        let list_parent_id = [comment_id];

        all_comment = all_comment.map(parent_comment => {
            if (parent_comment.id === comment_top_parent_id) {
                parent_comment.children = parent_comment.children
                    .filter(child_comment => child_comment.id !== comment_id)
                    .filter(child_comment => {
                        if (list_parent_id.includes(child_comment.direct_parent__id)) {
                            list_parent_id = [...list_parent_id, child_comment.id];
                            // Remove comment html element from DOM
                            let html_id = `#comment_${new Date(child_comment.added).getTime()}`;
                            let child_comment_html = document.querySelector(html_id);
                            deleteWithAnimation(child_comment_html, is_child = true);
                        }
                        return !list_parent_id.includes(child_comment.direct_parent__id); // Remove comment data from all_comment
                    });
                parent_comment.nbr_child = parent_comment.children.length;
            }
            return parent_comment;
        });
    }
}

/*********** Scroll to a specific comment *************
 * ****************************************************/
function scrollToComment(targetComment) {
    targetComment.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
    });
    let htmlTarget = targetComment.querySelector(".comment_content");
    if (htmlTarget.classList.contains("scroll_to"))
        htmlTarget.classList.remove("scroll_to");

    window.setTimeout(() => {
        htmlTarget.classList.remove('scroll_to');
    }, 4000);

    htmlTarget.classList.add('scroll_to');
}


/****** Add the owner of parent comment as a tag ******
 ******************************************************/
function add_user_tag(comment_value, parent_comment) {
    let reply_to = get_comment_attribute(
        parent_comment,
        attr = "author_name"
    );
    reply_content = get_comment_attribute(parent_comment, attr = "content");
    let htmlTarget = parent_comment.querySelector(".comment_content");
    let tag = document.createElement("a");
    tag.setAttribute("href", "#");
    tag.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        scrollToComment(parent_comment)
    });
    tag.innerHTML = `
	<span class="reply_to">
	    <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="reply" class="svg-inline--fa fa-reply fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M8.309 189.836L184.313 37.851C199.719 24.546 224 35.347 224 56.015v80.053c160.629 1.839 288 34.032 288 186.258 0 61.441-39.581 122.309-83.333 154.132-13.653 9.931-33.111-2.533-28.077-18.631 45.344-145.012-21.507-183.51-176.59-185.742V360c0 20.7-24.3 31.453-39.687 18.164l-176.004-152c-11.071-9.562-11.086-26.753 0-36.328z"></path></svg>
	    <span class="reply_author">@${reply_to}</span>
	    <span class="reply_content">${reply_content}</span>
        </span>`;
    let comment_text = document.createElement("span");
    comment_text.setAttribute('class', 'comment_text');
    comment_text.innerText = comment_value;

    let comment_content = document.createElement("p");
    comment_content.appendChild(tag);
    comment_content.appendChild(comment_text);
    return comment_content;
}

/****************  return color index  ****************
 ******************************************************/
function setBorderLeftColor(comment, parent_element) {
    try {
        let index = Number.parseInt(parent_element.dataset.level) + 1;
        if (index >= COLORS.length) {
            comment.dataset.level = COLORS.length - 1;
            comment.querySelector(".comment_content")
                .style.borderLeft = `4px solid ${COLORS[COLORS.length - 1]}`;
            comment.querySelector(".comments_icon")
                .style.color = `${COLORS[COLORS.length - 1]}`;
        }
        else {
            comment.dataset.level = index;
            comment.querySelector(".comment_content")
                .style.borderLeft = `4px solid ${COLORS[index]}`;
            comment.querySelector(".comments_icon")
                .style.color = `${COLORS[index]}`;
        }
    } catch (e) {
        comment.dataset.level = COLORS.length - 1;
        comment.querySelector(".comment_content")
            .style.borderLeft = `4px solid ${COLORS[COLORS.length - 1]}`;
        comment.querySelector(".comments_icon")
            .style.color = `${COLORS[COLORS.length - 1]}`;
    }
}
/****************  Add parent Comment  ****************
 ******************************************************/
if (is_authenticated) {
    let add_parent_comment = document.querySelector("form.add_parent_comment");
    add_parent_comment.addEventListener("submit", (e) => {
        e.preventDefault();
        let date_added = new Date();
        let el = add_parent_comment.querySelector(".new_parent_comment")
        if (el.value.trim() != "") {
            let comment_content = el.value;
            let c = new Comment(
                owner = user_fullName,
                content = comment_content,
                likes = 0,
                added_since = date_added,
                id = `comment_${date_added.getTime()}`,
                is_parent = true,
                is_comment_owner = true);
            c.dataset.level = '-1';
            document.querySelector(".comment_container .comment_content form.add_parent_comment").after(c);
            el.value = "";
            // INSERT INTO DATABASE THE CURRENT COMMENT CHILD
            save_comment(comment_content, date_added.toISOString());
        }
    });
}
/*****  Fetch children and add them into the DOM  *****
 ******************************************************/
function fetch_comment_children(parent_comment_html, parent_comment_id) {
    // fetch children only once
    if (all_comment.find(c => c.id === parent_comment_id).children.length === 0) {
        const children_loader = loader.cloneNode(true)
        children_loader.classList.remove('hide'); // waiting for charging children
        parent_comment_html.querySelector(".comments_children_container").appendChild(children_loader)

        let url = base_url.replace('/comment/', `/comment/${parent_comment_id}/`);
        fetch(url).then(response => {
            response.json().then(data => {
                // Saving children in all_comment
                all_comment = all_comment.map(parent_comment => {
                    if (parent_comment.id === parent_comment_id) {
                        parent_comment_html.querySelector(".comments_children_container").removeChild(children_loader);
                        parent_comment.children = data.children
                        // Update DOM with children comments
                        parent_comment.children.forEach(comment_child => {
                            let parent_to_scroll = parent_comment_html;
                            if (comment_child.direct_parent__id != null && comment_child.direct_parent__id !== comment_child.parent__id) {
                                let direct_parent_comment = parent_comment.children.find(
                                    (c_obj) => c_obj.id === comment_child.direct_parent__id);
                                let direct_parent_html_id = `comment_${new Date(
                                    direct_parent_comment.added).getTime().toString()}`;
                                parent_to_scroll = parent_comment_html.querySelector(`#${direct_parent_html_id}`);
                            }

                            let date_added = new Date(comment_child.added);

                            let comment_child_content = add_user_tag(
                                comment_child.content,
                                parent_to_scroll,
                                parent_comment.author_name
                            );

                            let comment_child_html = new Comment(
                                owner = `${comment_child.author_name}`,
                                content = comment_child_content,
                                likes = comment_child.nbr_vote,
                                added_since = date_added,
                                id = `comment_${date_added.getTime()}`,
                                is_parent = false,
                                is_comment_owner = comment_child.is_owner
                            );

                            parent_comment_html.querySelector(".comments_children_container").appendChild(comment_child_html)
                            setBorderLeftColor(comment_child_html, parent_to_scroll)
                            manage_vote_frontend(comment_child.id, comment_child_html);
                        });
                    }
                    return parent_comment;
                });
            });
        });
    }

}

/****************  Add child Comment  *****************
 ******************************************************/
function add_child_comment(el, container_el, top_parent_comment_html) {
    let date_added = new Date();
    if (el.value.trim() !== "") {
        let child_direct_parent = document.querySelector(
            `#${el.parentElement.parentElement.dataset.comment}`)

        let comment_child_content = add_user_tag(
            el.value,
            child_direct_parent,
        );
        let c = new Comment(
            owner = user_fullName,
            content = comment_child_content,
            likes = 0,
            added_since = date_added,
            id = `comment_${date_added.getTime()}`,
            is_parent = false,
            is_comment_owner = true);
        setBorderLeftColor(c, child_direct_parent)
        container_el.appendChild(c);

        hide_or_add_show_children_btn(
            top_parent_comment_html,
            get_comment_attribute(top_parent_comment_html),
            top_parent_comment_html.querySelector('.comments_children_container').childElementCount
        );
        update_answer_text(top_parent_comment_html)

        // INSERT INTO DATABASE THE CURRENT COMMENT CHILD
        let p_id = get_comment_attribute(child_direct_parent);

        // Scroll to the comment child
        scrollToComment(c);
        save_comment(el.value, date_added.toISOString(), p_id, top_parent_comment_html);
    }
}

/*********  Return backend comment attribute  *********
 ******************************************************/
function get_comment_attribute(comment_html, attr = "id") {
    let curr_html_id = comment_html.getAttribute('id');
    let comment_attr = null
    for (const comment of all_comment) {
        let comment_htmlID = `comment_${new Date(comment.added).getTime()}`;
        if (comment_htmlID == curr_html_id) {
            comment_attr = comment[attr];
            break;
        }
        for (const child_comment of comment.children) {
            comment_htmlID = `comment_${new Date(child_comment.added).getTime()}`;
            if (comment_htmlID == curr_html_id) {
                comment_attr = child_comment[attr];
                break;
            }
        }
        if (comment_attr) return comment_attr;
    }
    return comment_attr;
}

function htmlContainsClass(html_el, classes) {
    let ctn = true;
    classes.split('.').forEach(cls => {
        if (!html_el.classList.contains(cls))
            ctn = false;
    });
    return ctn;
}

/**********  Get parentNode or sibling node  **********
 ******************************************************/
function get_node(el, class_name, not) {
    class_name = class_name || "comment_container";
    not = not || "";
    let selector = !!not ? `.${class_name}:not(.${not})` : `.${class_name}`;
    let foundedElement = el.querySelector(selector);
    if (htmlContainsClass(el, class_name) && !htmlContainsClass(el, not)) {
        return el;
    }
    if (foundedElement) {
        return foundedElement;
    }
    else {
        return get_node(el.parentElement, class_name, not);
    }
}

/*******  Manage hide/show child comment text  ********
 ******************************************************/
function update_answer_text(el) {
    let children_container = get_node(el, "comments_children_container");
    let nb_child = children_container.childElementCount;
    nb_child = nb_child === 0 ? '' : nb_child;
    let txt = gettext("Answers");
    txt = `${nb_child} ${txt}`;
    let answer_text_element = el.querySelector(".comment_show_children_btn");
    if (answer_text_element)
        answer_text_element.innerText = txt;
}

/*****************  Manage vote svg  ******************
 ******************************************************/
function manage_vote_frontend(id, el) {
    VOTED_COMMENTS.forEach(obj => {
        if (obj.comment__id === id) {
            el.querySelector(".comment_vote_action").classList.add('voted');
        }
    });
}

/******* Set number comments in comment label *********
 * ****************************************************/
function set_comments_number() {
    let label_text = comment_label.innerText.replace(/\d+\s+/, '');
    let nb_comments = all_comment.reduce((acc, curr) => acc += curr.nbr_child, 0) + all_comment.length;
    comment_label.innerText = `${nb_comments} ${label_text}`;
}


/************  Get vote from the server  **************
 ******************************************************/
fetch(base_vote_url).then(response => {
    loader.classList.remove('hide'); // show loader
    response.json().then(data => {
        VOTED_COMMENTS = data.comments_votes;
    });
}).finally(function () {
    /************  Get data from the server  **************
     ******************************************************/
    let url = `${base_url}?only=parents`;
    fetch(url).then(response => {
        response.json().then(data => {
            loader.classList.add('hide'); // hide loader
            all_comment = [];
            data.forEach(comment_data => {
                comment_data.children = []; // init children to empty array
                all_comment = [...all_comment, comment_data] // updating all_comment
                let parent_container = document.querySelector('.comment_container .comment_content');
                let date_added = new Date(comment_data.added);
                let html_id = `comment_${date_added.getTime().toString()}`;
                let parent_c = new Comment(
                    owner = `${comment_data.author_name}`,
                    content = comment_data.content,
                    likes = comment_data.nbr_vote,
                    added_since = date_added,
                    id = html_id,
                    is_parent = true,
                    is_comment_owner = comment_data.is_owner
                );
                parent_c.dataset.level = '-1';
                manage_vote_frontend(comment_data.id, parent_c);
                if (is_authenticated)
                    parent_container.querySelector('form.add_parent_comment').after(parent_c);
                else
                    parent_container.querySelector(".comment_counter_container").after(parent_c);
                hide_or_add_show_children_btn(parent_c, comment_data.id, comment_data.nbr_child);
            });
            set_comments_number() // update number of comments from comment label
        });
    });
});
