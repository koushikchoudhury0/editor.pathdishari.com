$(document).ready(() => {
    
});

var logout = () => {                
    engageProgress({
        msg: "Signing you out...."
    });    
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-logout",
        headers: {
            "Authorization": Cookies.get("token")
        }
    }).done((responseBody) => {                        
        Cookies.remove("token");
        window.location.replace("/");
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Coudn't Logout",
                body: "Something went wrong. Try checking your internet connection"
            });
        }
    });
}