var type = "username";
$(document).ready(() => {
    
    try{
        if (Cookies.get("token")){
            console.log("got cookie");
            window.location.replace("/paper.html");
            return;   
        } else console.log("got no cookie");
    } catch (err) {
        console.log("error while getting cookie: ", err);
    }
    
    $("body").css({"visibility": "visible"});

    $("#keyText").on("input", (e) => {
        detectCredType();
    }).keypress(function(event){
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if(keycode == '13'){
            $("#passwordText").focus();	
        }    
    });

    $("#passwordText").keypress(function(event){
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if(keycode == '13'){
            login();
        }    
    });

    loadMaterialModalPromise(".modalContainer").then(()=>{
        
    });
});

var login = () => {
    if (!areCredsValid()){
        engageDialog({
            head: "Oops!",
            body: "Enter proper credentials"
        });
        return;
    }
    engageProgress({
        msg: "Getting you in...."
    });
    var requestBody = {
        mode: 1,
        key: $("#keyText").val(),
        password: $("#passwordText").val()
    }
    $.post("https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/auth", JSON.stringify(requestBody))
    .done((responseBody) => {
        try{
            if (responseBody.statusCode != 1){
                engageDialog({
                    head: "Oops!",
                    body: responseBody.cause==4?"Incorrect password":responseBody.cause==2?"You are not an editor":"Something went wrong!"
                });    
            } else {
                console.log("saving cache...");
                Cookies.set("token", responseBody.token, {expires: 1});
                console.log(Cookies.get("token"));
                dismissDialog();
                console.log("saving cache...redirecting");
                window.location.replace("/paper.html");
            }
        } catch (err) {
            engageDialog({
                head: "Oops!",
                body: "Something went wrong!"
            });
        }
    }).fail(() => {
        engageDialog({
            head: "Oops!",
            body: "Something went wrong! Check your internet connectivity and try again"
        });
    });
}

var areCredsValid = () => {
    if ($("#keyText").val()==undefined || $("#keyText").val()==null || $("#keyText").val().length<2) return false;
    if ($("#passwordText").val()==undefined || $("#passwordText").val()==null || $("#passwordText").val().length<2) return false;
    return true;
}

var detectCredType = () => {
    if ($.isNumeric($("#keyText").val().charAt(0))){
        type = "phone";
        if (!$("#changableIcon").text().includes("call")) $("#changableIcon").text("call");
    } else if ($("#keyText").val().includes("@")){
        type = "email";
        if (!$("#changableIcon").text().includes("email")) $("#changableIcon").text("email");
    } else {
        type = "username";
        if (!$("#changableIcon").text().includes("account_circle")) $("#changableIcon").text("account_circle");
    }
}

var cloak = (element) => {
    var passwordText = $("#passwordText");
    if (passwordText.prop("type") === "password") {
        passwordText.prop("type", "text");
        $("#cloakIcon").text("visibility_off");
    } else {
        passwordText.prop("type", "password");
        $("#cloakIcon").text("visibility");
    }
}