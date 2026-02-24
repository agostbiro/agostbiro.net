(function block()
{
'use strict';

// Make harvesting the e-mail address harder.
window.setTimeout(
    function callback()
    {
    var
        anchor = document.getElementById('email'),
        address = String.fromCharCode(
        97, 103, 111, 115, 116, 46, 98, 105, 114, 111, 64,
        103, 109, 97, 105, 108, 46, 99, 111, 109
        );

    anchor.href = "mailto:" + address;
    },
    10
);

})();
