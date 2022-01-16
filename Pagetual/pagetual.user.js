// ==UserScript==
// @name         Pagetual
// @name:zh-CN   东方永页机
// @name:zh-TW   東方永頁機
// @namespace    hoothin
// @version      0.1
// @description  Simple Auto Page
// @description:zh-CN  自动翻页
// @description:zh-TW  自動翻頁
// @author       hoothin
// @include      http*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM.xmlhttpRequest
// @grant        GM.registerMenuCommand
// @grant        GM.notification
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.addStyle
// ==/UserScript==

(function() {
    'use strict';

    if (window.name === 'pagetual-iframe') {
        var domloaded = function (){
            window.scroll(window.scrollX, 99999);
            window.parent.postMessage('pagetual-iframe:DOMLoaded', '*');
        };
        if(window.opera){
            document.addEventListener('DOMContentLoaded', domloaded, false);
        } else {
            domloaded();
        }
        return;
    }

    if(window.top != window.self){
        return;
    }

    const lang = navigator.appName=="Netscape"?navigator.language:navigator.userLanguage;
    var i18n=(name)=>{
        let config={};
        switch (lang){
            case "zh-CN":
            case "zh-SG":
            case "zh-TW":
            case "zh-HK":
            default:
                config={
                    configure:"Configure"
                };
                break;
        }
        return config[name]?config[name]:name;
    };

    var _GM_xmlhttpRequest,_GM_registerMenuCommand,_GM_notification,_GM_addStyle;
    if(typeof GM_xmlhttpRequest!='undefined'){
        _GM_xmlhttpRequest=GM_xmlhttpRequest;
    }else if(typeof GM!='undefined' && typeof GM.xmlhttpRequest!='undefined'){
        _GM_xmlhttpRequest=GM.xmlhttpRequest;
    }
    if(typeof GM_registerMenuCommand!='undefined'){
        _GM_registerMenuCommand=GM_registerMenuCommand;
    }else if(typeof GM!='undefined' && typeof GM.registerMenuCommand!='undefined'){
        _GM_registerMenuCommand=GM.registerMenuCommand;
    }
    if(typeof GM_notification!='undefined'){
        _GM_notification=GM_notification;
    }else if(typeof GM!='undefined' && typeof GM.notification!='undefined'){
        _GM_notification=GM.notification;
    }
    if(typeof GM_addStyle!='undefined'){
        _GM_addStyle=GM_addStyle;
    }else if(typeof GM!='undefined' && typeof GM.addStyle!='undefined'){
        _GM_addStyle=GM.addStyle;
    }

    if(typeof _GM_xmlhttpRequest=='undefined')_GM_xmlhttpRequest=(f)=>{};
    if(typeof _GM_registerMenuCommand=='undefined')_GM_registerMenuCommand=(s,f)=>{};
    if(typeof _GM_notification=='undefined')_GM_notification=(s)=>{};
    var _unsafeWindow=(typeof unsafeWindow=='undefined')?window:unsafeWindow;
    var storage={
        supportGM: typeof GM_getValue=='function' && typeof GM_getValue('a','b')!='undefined',
        supportGMPromise: typeof GM!='undefined' && typeof GM.getValue=='function' && typeof GM.getValue('a','b')!='undefined',
        mxAppStorage:(function(){
            try{
                return window.external.mxGetRuntime().storage;
            }catch(e){
            }
        })(),
        operaUJSStorage:(function(){
            try{
                return window.opera.scriptStorage;
            }catch(e){
            }
        })(),
        setItem:function(key,value){
            if(this.operaUJSStorage){
                this.operaUJSStorage.setItem(key,value);
            }else if(this.mxAppStorage){
                this.mxAppStorage.setConfig(key,value);
            }else if(this.supportGM){
                GM_setValue(key,value);
            }else if(this.supportGMPromise){
                GM.setValue(key,value);
            }else if(window.localStorage){
                window.localStorage.setItem(key,value);
            }
        },
        getItem:function(key,cb){
            var value;
            if(this.operaUJSStorage){
                value=this.operaUJSStorage.getItem(key);
            }else if(this.mxAppStorage){
                value=this.mxAppStorage.getConfig(key);
            }else if(this.supportGM){
                value=GM_getValue(key);
            }else if(this.supportGMPromise){
                value=GM.getValue(key).then(v=>{cb(v)});
                return;
            }else if(window.localStorage){
                value=window.localStorage.getItem(key);
            };
            cb(value);
        }
    };

    function getElementByXpath(xpath, contextNode, doc){
        doc = doc || document;
        contextNode = contextNode || doc;
        try {
            var result = doc.evaluate(xpath, contextNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            return result.singleNodeValue && result.singleNodeValue.nodeType === 1 && result.singleNodeValue;
        } catch (err) {
            throw new Error(`Invalid xpath: ${xpath}`);
        }
    }

    function getAllElementsByXpath(xpath, contextNode, doc){
        doc = doc || document;
        contextNode = contextNode || doc;
        var result = [];
        try {
            var query = doc.evaluate(xpath, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for (var i = 0; i < query.snapshotLength; i++) {
                var node = query.snapshotItem(i);
                if (node.nodeType === 1) result.push(node);
            }
        } catch (err) {
            throw new Error(`Invalid xpath: ${xpath}`);
        }
        return result;
    }

    class RuleParser {
        /*
         name
         url
         enable
         type 0 div 1 iframe
         nextLink 下一頁的xpath或者selector
         pageElement //頁面主體的xpath或者selector
         lazyImgSrc //圖片延後加載的屬性直接賦值到src
         css //添加樣式
         insert: '//div[@id="res"]',
         insertPos: 1, 1 之前 2 裏面最後
         pageAction:(document, eles) //對每一個插入的頁面進行修剪
         init:(document) // 對主頁面進行處理
        */
        constructor() {
            this.rules=[
                {
                    from:1,
                    name:"yande",
                    type:0,
                    url:"^https:\/\/yande\.re\/",
                    pageElement:"ul#post-list-posts>li",
                    nextLink:"a.next_page",
                    css:".javascript-hide {display: inline-block !important;}"
                },
                {
                    from:1,
                    name:"tieba",
                    type:1,
                    url:"^https:\/\/tieba\.baidu.com\/f\?kw=",
                    pageElement:"ul#thread_list>li",
                    nextLink:".next.pagination-item "
                }
            ];
            this.pageDoc=document;
            this.curUrl=location.href;
            this.curSiteRule={};
            this.findPageElementSelector="";
        }

        initSavedRules(){
            storage.getItem("rules", rules=>{
                this.rules=this.rules.concat(rules);
            });
        }

        requestJSON(url, callback){
            _GM_xmlhttpRequest({
                url: url,
                onload: function(res) {
                    let json=null;
                    try{
                        json=JSON.parse(res.response);
                    }catch(e){}
                    callback(json);
                }
            });
        }

        formatRule(item, from){
            switch(from){
                case 0:
                    return {
                        from:from,
                        name:item.name,
                        type:item.data.forceIframe=="true"?1:0,
                        url:item.data.url,
                        pageElement:item.data.pageElement,
                        nextLink:item.data.nextLink,
                        insert:item.data.insertBefore,
                        insertPos:1,
                        updatedAt:item.data.updated_at,
                        css:item.data.Stylus+item.data.CSS,
                        pageAction:item.data.bookmarklet
                    };
                    break;
                case 1:
                default:
                    item.from=from;
                    return item;
                    break;
            }
            return null;
        }

        addRuleByUrl(url, from, callback) {
            this.requestJSON(url, json=>{
                this.addRules(json, from);
                callback();
            });
        }

        addRules(rules, from) {
            rules.forEach(item=>{
                let rule=this.formatRule(item, from);
                if(rule){
                    for(let i=0;i<this.rules.length;i++){
                        if(this.rules[i].name==rule.name){
                            //this.rules.splice(i,1);
                            break;
                        }
                    }
                    this.rules.push(rule);
                }
            });
        }

        getRule() {
            if(this.curSiteRule && this.curSiteRule.url){
                return this.curSiteRule;
            }
            var self=this;
            for(let i in this.rules){
                let rule=this.rules[i];
                let urlReg=new RegExp(rule.url, "i");
                if(urlReg.test(location.href)){
                    let pageElement,nextLink,insert;
                    if(rule.pageElement)pageElement=rule.from==0?getElementByXpath(rule.pageElement):document.querySelector(rule.pageElement);
                    if(rule.nextLink)nextLink=rule.from==0?getElementByXpath(rule.nextLink):document.querySelector(rule.nextLink);
                    if(rule.insert)insert=rule.from==0?getElementByXpath(rule.insert):document.querySelector(rule.insert);
                    if((rule.pageElement && !pageElement) ||
                       (rule.nextLink && !nextLink) ||
                       (rule.insert && !insert)){
                        continue;
                    }
                    this.curSiteRule=rule;
                    console.log(rule);
                    return rule;
                }
            }
            this.curSiteRule={};
            return null;
        }

        geneSelector(ele){
            let selector=ele.tagName;
            if(ele.id) selector += '#' + ele.id;
            if(ele.classList) selector += [].map.call(ele.classList,d=>'.'+d).join('');
            let parent = ele.parentElement;
            if(parent) selector = this.geneSelector(parent) + ' > ' + selector +`:nth-child(${[].indexOf.call(parent.children,ele)+1})` ;
            return selector;
        }

        getPageElement(doc) {
            let pageElement=null;
            let self=this;
            if(this.curSiteRule.pageElement){
                pageElement=this.curSiteRule.from==0?getAllElementsByXpath(this.curSiteRule.pageElement,doc):doc.querySelectorAll(this.curSiteRule.pageElement);
            }
            if(!pageElement && this.findPageElementSelector){
                pageElement=doc.querySelectorAll(this.findPageElementSelector);
            }
            if(!pageElement && !this.curSiteRule.pageElement){
                let body=doc.body,bodyHeight=parseInt(_unsafeWindow.getComputedStyle(body).height);
                function checkElement(ele){
                    let curHeight=parseInt(_unsafeWindow.getComputedStyle(ele).height);
                    if(curHeight/bodyHeight<=0.6)return null;
                    if(ele.children.length==0){
                        self.findPageElementSelector=self.geneSelector(ele.parentNode)+">"+ele.tagName;
                        return [ele];
                    }
                    let i,maxHeight=curHeight*0.3;
                    for(i=0;i<ele.children.length;i++){
                        let curNode=ele.children[i];
                        curHeight=parseInt(_unsafeWindow.getComputedStyle(curNode).height);
                        if(curHeight>maxHeight){
                            return checkElement(curNode);
                        }
                    }
                    self.findPageElementSelector=self.geneSelector(ele)+">*";
                    return ele.children;
                }
                pageElement=checkElement(body);
            }
            return pageElement;
        }

        getPage(){
            let url=this.curUrl;
            let doc=this.pageDoc;
            let pageNum=0,preStr="",afterStr="";
            let pageMatch1=url.match(/(.*[a-zA-Z0-9][\-_])(\d+)(\.html?$|$)/i);
            let pageMatch2=url.match(/(.*[\?&]p(?:age)?=)(\d+)($|#.*)/i);
            if(pageMatch1){
                preStr=pageMatch1[1];
                pageNum=pageMatch1[2];
                afterStr=pageMatch1[3];
            }else if(pageMatch2){
                preStr=pageMatch2[1];
                pageNum=pageMatch2[2];
                afterStr=pageMatch2[3];
            }
            var curPage=doc,i,cur;
            let next=curPage.querySelector("a.next");
            if(!next)next=curPage.querySelector("a#next");
            if(!next)next=curPage.querySelector('[rel="next"]');
            if(!next)next=curPage.querySelector("a#rightFix");
            if(next && (!next.href || /javascript:/.test(next.href)))next=null;
            if(!next){
                let aTags=curPage.querySelectorAll("a");
                let nextf,nexts,nextt;
                for(i=0;i<aTags.length;i++){
                    let aTag=aTags[i];
                    if(!aTag.href || /javascript:/.test(aTag.href))continue;
                    if(nextf && nexts && nextt)break;
                    if(!nextf){
                        if(/下[一1]?[页頁张張]|next( page)?|次のページ/i.test(aTag.innerHTML)){
                            nextf=aTag;
                        }
                    }
                    if(!nexts){
                        if(aTag.innerHTML=="&gt;"){
                            nexts=aTag;
                        }
                    }
                    if(!nextt){
                        if(aTag.innerHTML=="»"){
                            nextt=aTag;
                        }else if(aTag.href.replace(preStr,"").replace(afterStr,"")==parseInt(pageNum)+1){
                            nextt=aTag;
                        }else if(aTag.href.indexOf(url)!=-1 && /[\?&]p(age)?=/i.test(aTag.href.replace(url,""))){
                            nextt=aTag;
                        }
                    }
                }
                next=nextf||nexts||nextt;
            }
            if(!next)next=curPage.querySelector(".next>a");
            if(!next){
                let pageDiv=curPage.querySelector("div.wp-pagenavi");
                if(pageDiv){
                    cur=pageDiv.querySelector("span.current");
                    next=cur.nextSibling;
                }else{
                    cur=curPage.querySelector("div.article-paging>span");
                    if(cur){
                        next=cur.nextElementSibling;
                    }
                }
            }
            return next;
        }

        getNextLink() {
            let nextLink=null;
            if(this.curSiteRule.nextLink)nextLink=this.curSiteRule.from==0?getElementByXpath(this.curSiteRule.nextLink,this.pageDoc):this.pageDoc.querySelector(this.curSiteRule.nextLink);
            if(!nextLink){
                nextLink=this.getPage();
            }
            return nextLink;
        }

        getInsert(refresh) {
            if(this.insert && !refresh)return this.insert;
            if(this.curSiteRule.insert){
                this.insert=this.curSiteRule.from==0?getElementByXpath(this.curSiteRule.insert,document):document.querySelector(this.curSiteRule.insert);
            }else{
                let pageElement=this.getPageElement(document);
                if(pageElement && pageElement.length>0){
                    var pELast = pageElement[pageElement.length - 1];
                    this.insert = pELast.nextSibling ? pELast.nextSibling : pELast.parentNode.appendChild(document.createTextNode(' '));
                }
            }
            return this.insert;
        }

        pageAction(document,eles){
            let code=this.curSiteRule.pageAction;
            if(code){
                _unsafeWindow.eval(code);
            }
            let css=this.curSiteRule.css;
            if(css){
                _GM_addStyle(css);
            }
            let lazyImgSrc=this.curSiteRule.lazyImgSrc;
            if(lazyImgSrc){
                [].forEach.call(eles, ele=>{
                    [].forEach.call(ele.querySelectorAll("img"), img=>{
                        if(img[lazyImgSrc]){
                            img.src=img[lazyImgSrc];
                        }
                    });
                });
            }
        }

        initPage(){
            this.getRule();
            let code=this.curSiteRule.init;
            if(code){
                _unsafeWindow.eval(code);
            }
        }

        insertPage(doc, eles, url){
            this.pageDoc=doc;
            this.curUrl=url;
            this.pageAction(doc, eles);
            var self=this;
            if(!eles || eles.length==0){
            }else{
                [].forEach.call(eles, ele=>{
                    if(self.curSiteRule.insertPos==2){
                        self.insert.appendChild(ele);
                    }else{
                        self.insert.parentNode.insertBefore(ele, self.insert);
                    }
                });
            }
        }
    }
    var ruleParser = new RuleParser();

    function initRules(callback) {
        /*0 wedata格式，1 pagetual格式*/
        var ruleUrls=[
            {
                url:'http://wedata.net/databases/AutoPagerize/items_all.json',
                from:0
            },
            {
                url:'https://github.com/hoothin/UserScripts/raw/master/Pagetual/pagetualRules.json',
                from:1
            }
        ],i=0;

        storage.getItem("rules", rules=>{
            storage.getItem("importRuleUrl", urls=>{
                if(urls)ruleUrls=ruleUrls.concat(urls);
                storage.getItem("ruleLastUpdate", date=>{
                    let now=new Date().getTime();
                    if(!date || now-date>24*60*60*1000){
                        ruleUrls.forEach(rule=>{
                            ruleParser.addRuleByUrl(rule.url, rule.from, ()=>{
                                if(++i==ruleUrls.length){
                                    storage.setItem("ruleLastUpdate", now);
                                    callback();
                                }
                            });
                        });
                    }else{
                        callback();
                    }
                });
            });
        });
    }

    function requestDoc(url, callback){
        _GM_xmlhttpRequest({
            url: url,
            onload: function(res) {
                var doc=null;
                try {
                    doc=document.implementation.createHTMLDocument('');
                    doc.documentElement.innerHTML=res.response;
                }
                catch (e) {
                    console.log('parse error');
                }
                let pageElement=ruleParser.getPageElement(doc);
                //只有1的話怕不是圖片哦
                if(pageElement && pageElement.length>1){
                    callback();
                    ruleParser.insertPage(doc, pageElement, url);
                }else{
                    requestFromIframe(url, (doc, eles)=>{
                        callback();
                        ruleParser.insertPage(doc, eles, url);
                    });
                }
            }
        });
    }

    function requestFromIframe(url, callback, nextlinkSel, pageSel){
        let orgPage,curPage;
        let iframe = document.createElement('iframe');
        function checkPage(doc){
            //todo: 無法獲取跳轉之後的url
            curPage=doc.querySelector(pageSel);
            if(orgPage == curPage){
                setTimeout(()=>{
                    checkPage();
                },500);
            }else{
                let eles=ruleParser.getPageElement(doc);
                if(eles && eles.length>0){
                    callback(doc, eles);
                }
                document.body.removeChild(iframe);
            }
        }
        iframe.name = 'pagetual-iframe';
        iframe.width = '100%';
        iframe.height = '0';
        iframe.frameBorder = '0';
        iframe.style.cssText = 'margin:0!important;padding:0!important;visibility:hidden!important;';
        iframe.addEventListener("load", e=>{
            let doc=iframe.contentWindow.document;
            if(nextlinkSel){
                orgPage=doc.querySelector(pageSel);
                doc.querySelector(nextlinkSel).click();
                checkPage(doc);
            }else{
                let eles=ruleParser.getPageElement(doc);
                if(eles && eles.length>0){
                    callback(doc, eles);
                }
                document.body.removeChild(iframe);
            }
        });
        iframe.src=url;
        document.body.appendChild(iframe);
    }

    function initPage(){
        ruleParser.initPage()
        nextPage();
        initListener();
    }

    function initView(){
        _GM_addStyle(`
         .pagetual_pageBar.stop {
           -webkit-filter: invert(100%);
           filter: invert(100%);
           opacity: 1;
         }
         .pagetual_pageBar {
           opacity: 0.1;
         }
         .pagetual_pageBar:hover {
           opacity: 1;
         }
         .pagetual_pageBar>span {
           vertical-align: super;
         }

         .pagetual_balls div:nth-of-type(3) {
           transform: translateX(-95%);
           animation: right-swing 0.5s ease-out alternate infinite;
         }

         @keyframes left-swing {
           50%,
           100% {
             transform: translateX(95%);
           }
         }

         @keyframes right-swing {
           50% {
             transform: translateX(-95%);
           }
           100% {
             transform: translateX(100%);
           }
         }
        `);
    }
    var loading=document.createElement("div");
    loading.style.cssText="display:none;cy: initial;d: initial;dominant-baseline: initial;empty-cells: initial;fill: initial;fill-opacity: initial;fill-rule: initial;filter: initial;flex: initial;flex-flow: initial;float: initial;flood-color: initial;flood-opacity: initial;grid: initial;grid-area: initial;height: initial;hyphens: initial;image-orientation: initial;image-rendering: initial;inline-size: initial;inset-block: initial;inset-inline: initial;isolation: initial;letter-spacing: initial;lighting-color: initial;line-break: initial;list-style: initial;margin-block: initial;margin: 0px auto;margin-inline: initial;marker: initial;mask: initial;mask-type: initial;max-block-size: initial;max-height: initial;max-inline-size: initial;max-width: initial;min-block-size: initial;min-height: initial;min-inline-size: initial;min-width: initial;mix-blend-mode: initial;object-fit: initial;object-position: initial;offset: initial;opacity: initial;order: initial;origin-trial-test-property: initial;orphans: initial;outline: initial;outline-offset: initial;overflow-anchor: initial;overflow-clip-margin: initial;overflow-wrap: initial;overflow: initial;overscroll-behavior-block: initial;overscroll-behavior-inline: initial;overscroll-behavior: initial;padding-block: initial;padding: initial;padding-inline: initial;page: initial;page-orientation: initial;paint-order: initial;perspective: initial;perspective-origin: initial;pointer-events: initial;position: initial;quotes: initial;r: initial;resize: initial;ruby-position: initial;rx: initial;ry: initial;scroll-behavior: initial;scroll-margin-block: initial;scroll-margin: initial;scroll-margin-inline: initial;scroll-padding-block: initial;scroll-padding: initial;scroll-padding-inline: initial;scroll-snap-align: initial;scroll-snap-stop: initial;scroll-snap-type: initial;scrollbar-gutter: initial;shape-image-threshold: initial;shape-margin: initial;shape-outside: initial;shape-rendering: initial;size: initial;speak: initial;stop-color: initial;stop-opacity: initial;stroke: initial;stroke-dasharray: initial;stroke-dashoffset: initial;stroke-linecap: initial;stroke-linejoin: initial;stroke-miterlimit: initial;stroke-opacity: initial;stroke-width: initial;tab-size: initial;table-layout: initial;text-align: initial;text-align-last: initial;text-anchor: initial;text-combine-upright: initial;text-decoration: initial;text-decoration-skip-ink: initial;text-indent: initial;text-overflow: initial;text-shadow: initial;text-size-adjust: initial;text-transform: initial;text-underline-offset: initial;text-underline-position: initial;touch-action: initial;transform: initial;transform-box: initial;transform-origin: initial;transform-style: initial;transition: initial;user-select: initial;vector-effect: initial;vertical-align: initial;visibility: initial;border-spacing: initial;-webkit-border-image: initial;-webkit-box-align: initial;-webkit-box-decoration-break: initial;-webkit-box-direction: initial;-webkit-box-flex: initial;-webkit-box-ordinal-group: initial;-webkit-box-orient: initial;-webkit-box-pack: initial;-webkit-box-reflect: initial;-webkit-highlight: initial;-webkit-hyphenate-character: initial;-webkit-line-break: initial;-webkit-line-clamp: initial;-webkit-mask-box-image: initial;-webkit-mask: initial;-webkit-mask-composite: initial;-webkit-perspective-origin-x: initial;-webkit-perspective-origin-y: initial;-webkit-print-color-adjust: initial;-webkit-rtl-ordering: initial;-webkit-ruby-position: initial;-webkit-tap-highlight-color: initial;-webkit-text-combine: initial;-webkit-text-decorations-in-effect: initial;-webkit-text-emphasis: initial;-webkit-text-emphasis-position: initial;-webkit-text-fill-color: initial;-webkit-text-security: initial;-webkit-text-stroke: initial;-webkit-transform-origin-x: initial;-webkit-transform-origin-y: initial;-webkit-transform-origin-z: initial;-webkit-user-drag: initial;-webkit-user-modify: initial;white-space: initial;widows: initial;width: initial;will-change: initial;word-break: initial;word-spacing: initial;x: initial;y: initial;z-index: 2147483647;";
    loading.innerHTML=`<svg width="120" height="30" viewBox="0 0 120 30" fill="#000000A0" style="display: block;position: initial;margin: auto;shape-rendering: auto;vertical-align: middle;visibility: visible;width: initial;height: initial;"><circle cx="15" cy="15" r="15"><animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite"></animate><animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite"></animate></circle><circle cx="60" cy="15" r="9" fill-opacity="0.3"><animate attributeName="r" from="9" to="9" begin="0s" dur="0.8s" values="9;15;9" calcMode="linear" repeatCount="indefinite"></animate><animate attributeName="fill-opacity" from="0.5" to="0.5" begin="0s" dur="0.8s" values=".5;1;.5" calcMode="linear" repeatCount="indefinite"></animate></circle><circle cx="105" cy="15" r="15"><animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite"></animate><animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite"></animate></circle></svg>`;
    document.body.appendChild(loading);

    var upSvg=`<svg style="position:absolute;cursor: pointer;margin: 0 -45px;width: 30px;height: 30px;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6364"><path d="M296 440c-44.1 0-80 35.9-80 80s35.9 80 80 80 80-35.9 80-80-35.9-80-80-80z" fill="#604b4a" p-id="6365"></path><path d="M960 512c0-247-201-448-448-448S64 265 64 512c0 1.8 0.1 3.5 0.1 5.3 0 0.9-0.1 1.8-0.1 2.7h0.2C68.5 763.3 267.7 960 512 960c236.2 0 430.1-183.7 446.7-415.7 0.1-0.8 0.1-1.6 0.2-2.3 0.4-4.6 0.5-9.3 0.7-13.9 0.1-2.7 0.4-5.3 0.4-8h-0.2c0-2.8 0.2-5.4 0.2-8.1z m-152 8c0 44.1-35.9 80-80 80s-80-35.9-80-80 35.9-80 80-80 80 35.9 80 80zM512 928C284.4 928 99 744.3 96.1 517.3 97.6 408.3 186.6 320 296 320c110.3 0 200 89.7 200 200 0 127.9 104.1 232 232 232 62.9 0 119.9-25.2 161.7-66-66 142.7-210.4 242-377.7 242z" fill="#604b4a" p-id="6366"></path></svg>`;
    var downSvg=`<svg style="position:absolute;cursor: pointer;margin: 0 15px;width: 30px;height: 30px;vertical-align: middle;fill: currentColor;overflow: hidden;transform: rotate(180deg);" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6364"><path d="M296 440c-44.1 0-80 35.9-80 80s35.9 80 80 80 80-35.9 80-80-35.9-80-80-80z" fill="#604b4a" p-id="6365"></path><path d="M960 512c0-247-201-448-448-448S64 265 64 512c0 1.8 0.1 3.5 0.1 5.3 0 0.9-0.1 1.8-0.1 2.7h0.2C68.5 763.3 267.7 960 512 960c236.2 0 430.1-183.7 446.7-415.7 0.1-0.8 0.1-1.6 0.2-2.3 0.4-4.6 0.5-9.3 0.7-13.9 0.1-2.7 0.4-5.3 0.4-8h-0.2c0-2.8 0.2-5.4 0.2-8.1z m-152 8c0 44.1-35.9 80-80 80s-80-35.9-80-80 35.9-80 80-80 80 35.9 80 80zM512 928C284.4 928 99 744.3 96.1 517.3 97.6 408.3 186.6 320 296 320c110.3 0 200 89.7 200 200 0 127.9 104.1 232 232 232 62.9 0 119.9-25.2 161.7-66-66 142.7-210.4 242-377.7 242z" fill="#604b4a" p-id="6366"></path></svg>`;
    var pageBarStyle=`border-radius: 20px;background-color: rgb(240 240 240 / 80%);visibility: visible; position: initial; width: auto; height: 30px; float: none; clear: both; margin: 1px auto; text-align: center; display: block;`;
    var pageTextStyle=`user-select: none;visibility: visible;position: initial;width: auto;height: auto;float: none;clear: both;margin: 0px auto;text-align: center;display: inline;font-weight: bold;font-style: normal;font-size: 16px;letter-spacing: initial;vertical-align: middle;color: rgb(85, 85, 95);`;

    var isPause=false,isLoading=false,curPage=1;

    function changeStop(stop){
        isPause=stop;
        [].forEach.call(document.querySelectorAll(".pagetual_pageBar"), bar=>{
            if(isPause){
                bar.classList.add("stop");
            }else{
                bar.classList.remove("stop");
            }
        });
    }

    function initListener(){
        document.addEventListener('scroll', e=>{
            setTimeout(()=>{
                if(!isPause && !isLoading){
                    let scrolly=window.scrollY;
                    let windowHeight=window.innerHeight;
                    let scrollH=Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
                    if(scrollH-scrolly-windowHeight<500){
                        nextPage();
                    }
                }
            },100);
        }, false);
        document.addEventListener('dblclick', e=>{
            changeStop(!isPause);
        });
    }

    function createPageBar(url, page){
        let pageBar=document.createElement("div");
        let upSpan=document.createElement("span");
        let downSpan=document.createElement("span");
        let pageText=document.createElement("a");
        pageBar.className="pagetual_pageBar";
        if(isPause){
            pageBar.classList.add("stop");
        }
        pageBar.style.cssText=pageBarStyle;
        pageBar.title="Disable";
        upSpan.innerHTML=upSvg;
        upSpan.title="To Top";
        downSpan.innerHTML=downSvg;
        downSpan.title="To Bottom";
        pageText.href=url;
        pageText.style=pageTextStyle;
        pageText.innerHTML="Page "+page;
        pageText.title="Current Page";
        pageBar.appendChild(upSpan);
        pageBar.appendChild(pageText);
        pageBar.appendChild(downSpan);

        upSpan.addEventListener("click", e=>{
            changeStop(true);
            document.body.scrollTop=0;
            document.documentElement.scrollTop=0;
            e.preventDefault();
            e.stopPropagation();
        });
        downSpan.addEventListener("click", e=>{
            changeStop(true);
            document.body.scrollTop=9999999;
            document.documentElement.scrollTop=9999999;
            e.preventDefault();
            e.stopPropagation();
        });
        pageBar.addEventListener("click", e=>{
            changeStop(!isPause);
        });
        pageText.addEventListener("click", e=>{
            e.stopPropagation();
        });
        return pageBar;
    }

    function nextPage(){
        let nextLink=ruleParser.getNextLink();
        let insert=ruleParser.getInsert();
        if(nextLink){
            if(nextLink.href){
                isLoading=true;
                loading.style.display="";
                requestDoc(nextLink.href, ()=>{
                    isLoading=false;
                    loading.style.display="none";
                    var pageBar=createPageBar(nextLink.href, ++curPage);
                    pageBar.style.width=parseInt(_unsafeWindow.getComputedStyle(insert.parentNode).width)-20+"px";
                    insert.parentNode.insertBefore(pageBar, insert);
                });
            }else{
            }
        }
    }

    function init(){
        initView();
        initRules(()=>{
            initPage();
        });
    }
    init();
})();