before('protect from forgery', function () {
    protectFromForgery('64089b734ad0f1798326f92359776a33377eb073');
});

before('ajax page load', function() {
    // jQuery mobile will do Ajax page requests. If we detect that, just
    // server the content that's unique per page.
    if (request.headers['x-requested-with'] == 'XMLHttpRequest') {
        layout(false);
    }
    next();
});
