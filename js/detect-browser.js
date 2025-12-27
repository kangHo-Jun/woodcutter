(function detectBrowser() {
  var agent = navigator.userAgent.toLowerCase(),
      name = navigator.appName;

  var ieVersion;

  // MS 계열 브라우저를 구분하기 위함.
  if(name === 'Microsoft Internet Explorer' || agent.indexOf('trident') > -1 || agent.indexOf('edge/') > -1) {
    browser = 'ie';
    if(name === 'Microsoft Internet Explorer') { // IE old version (IE 10 or Lower)
        agent = /msie ([0-9]{1,}[\.0-9]{0,})/.exec(agent);

        browser += ieVersion = parseInt(agent[1]);
    } else { // IE 11+
        if(agent.indexOf('trident') > -1) { // IE 11 
            browser += 11;
        } else if(agent.indexOf('edge/') > -1) { // Edge
            browser = 'edge';
        }
    }
  } else if(agent.indexOf('safari') > -1) { // Chrome or Safari
    if(agent.indexOf('opr') > -1) { // Opera
        browser = 'opera';
    } else if(agent.indexOf('chrome') > -1) { // Chrome
        browser = 'chrome';
    } else { // Safari
        browser = 'safari';
    }
  } else if(agent.indexOf('firefox') > -1) { // Firefox
    browser = 'firefox';
  }
  if(browser.startsWith('ie')) {
    alert('인터넷 익스플로러에서 정상적으로 작동하지 않을 수 있습니다. 크롬이나 파이어폭스를 사용해주세요.')
  }
  
}());
