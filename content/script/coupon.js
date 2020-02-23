
$(document).ready(() => {
    $("header").load("/content/layout/navbar.html", () => {        
        $("ul.tabs li:eq(4) a").addClass("active");
        $("main").css({"margin-top": $("header").height()});        
        $("#sectorList").on("change", () => {
            $("#sectorList").formSelect();
            //fetchAllExams($("#sectorList").formSelect('getSelectedValues')[0]);
            console.log($("#sectorList").formSelect('getSelectedValues')[0]);
            $("#sectorPreview").text($("#sectorList").formSelect('getSelectedValues')[0]);
            $("#fab").css({"visibility": "visible"});
        });        
        loadMaterialModalPromise(".modalContainer").then(()=>{    
            M.AutoInit();            
            $('.characterCountable').characterCounter();
            $(".sidenavHeader").html("Existing Coupons<i style=\"margin-right: 10px\" class='material-icons'>money</i>"); 
            enlistCoupons();
            //$("#flatRadio").prop("checked", true);
        }); 
        //$('.sidenav').sidenav(); 
        var clipboard = new ClipboardJS('#copier');      
        clipboard.on('success', function(e) {
            M.toast({html: "Exam ID Copied"});
            e.clearSelection();
        });
    });
    
});

var getSidenavElementBody = (couponCode, status) => {
    return '\
    <li>\
        <div onclick="fetchCouponData(this, \''+couponCode+'\')" class="waves-effect sidenavElement">\
            <a class="couponCode">'+couponCode+'</a>\
            <!--<div  class="couponData">\
                <a class="packageExamCount"><span class="customBadge '+((status==1)?'inactive':'')+'">'+((status==1)?'Inactive':'Active')+'</span></a>\
            </div>-->\
        </div>\
        <li><div style="margin-top: 0" class="divider"></div></li>\
    </li>\
    ';
}

var createCoupon = () => {
    couponData = {
        couponCode: $("#couponCodeNewText").val()        
    }      
    if (couponData.couponCode.length < 1){
        M.toast({html: "Coupon Code is mandatory"});
        return;
    }
    engageProgress({
        msg: "Creating Coupon"
    });       
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-create-coupon",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(couponData)
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                             
            M.toast({html: "Coupon Created"});
            $("ul#slide-out li:eq(0)").after(getSidenavElementBody(couponData.couponCode, 1));
            $("#inputContainer").modal('close');            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't create coupon",
                body: responseBody.cause==2?"This code already exists":"Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Coudn't create coupon",
                body: "Something went wrong"
            });
        }
    });
}

var enlistCoupons = () => {    
    engageProgress({
        msg: "Reading Coupons..."
    });       
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-read-coupon-keys",
        headers: {
            "Authorization": Cookies.get("token")
        }
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                             
            if (responseBody.couponKeys.length<1){
                M.toast({html: "No available coupons"});
            } else {
                responseBody.couponKeys.forEach((v, i) => {
                    $("ul#slide-out").append(getSidenavElementBody(v.couponCode, v.status));
                });
            }
            $("#inputContainer").modal('close');            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't read coupons",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Coudn't read coupons",
                body: "Something went wrong"
            });
        }
    });
}

var fetchCouponData = (elem, couponCode) => {    
    if (!couponCode){
        engageDialog({
            head: "That's not great",
            body: "You have selected to fetch something illegal"
        });
        return;
    }
    engageProgress({
        msg: "Reading Coupon "+couponCode+"..."
    });           
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-read-coupon",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            couponCode: couponCode
        })
    }).done((responseBody) => {                
        dismissDialog();
        console.log(responseBody);
        if (responseBody.statusCode==1){
            $(".sidenavElement").removeClass("active");
            $(elem).addClass("active");                           
            $("#couponCodeText").text(responseBody.couponData.couponCode);
            $("#couponIdText").text("https://pathdishari.com/coupons/?rebate="+couponCode);    
            if (responseBody.couponData.discountType) $((parseInt(responseBody.couponData.discountType)==1?"#flatRadio":"#percentageRadio")).prop("checked", true);
            else {
                $("#flatRadio").prop("checked", false);
                $("#percentageRadio").prop("checked", false);
            } 
            $("#couponAmountText").val(responseBody.couponData.discountAmount);
            $("#couponMaxText").val(responseBody.couponData.maximumDiscount);
            $("#couponThresholdText").val(responseBody.couponData.threshold);
            $("#couponLimitText").val(responseBody.couponData.limit);
            $("#couponUsedText").val(responseBody.couponData.used?responseBody.couponData.used:0);
            $("#TNCText").val(responseBody.couponData.TNC);
            $("#ELGText").val(responseBody.couponData.ELG);
            M.textareaAutoResize($('#TNCText'));
            M.textareaAutoResize($('#ELGText'));
            M.updateTextFields();                        
            if (responseBody.couponData.status==2){                      
                $("#toggleStateButton").removeClass("orange");
                $("#toggleStateButton").addClass("grey");
                $("#toggleStateButton").text("Deactivate");
            } else {
                $("#toggleStateButton").removeClass("grey");
                $("#toggleStateButton").addClass("orange");
                $("#toggleStateButton").text("Activate");
            }
            $(".container.placeholder").fadeOut("fast", () => {                
                $(".container.primary").fadeIn("fast");
            });
        } else {            
            engageDialog({
                head: "Coudn't read coupon",
                body: responseBody.cause==2?"That's odd. Refresh the page and retry. If this problem perists, contact the administrators immediately.":"Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Coudn't read coupon",
                body: "Something went wrong"
            });
        }
    });
}

var updateCouponStats = () => {    
    const checkedRadioId = $('input[type=radio][name=discountTypeRadioGroup]:checked').attr('id');
    if (!checkedRadioId){
        engageDialog({
            head: "Invalid Configuration",
            body: "Discount Type must be chosen"
        });
        return;
    }
    couponStats = {
        couponCode: $("#couponCodeText").text(),
        discountType: (checkedRadioId=="flatRadio"?1:2),
        discountAmount: parseInt($("#couponAmountText").val()),
        maximumDiscount: parseInt($("#couponMaxText").val()),
        threshold: parseInt($("#couponThresholdText").val()),
        limit: parseInt($("#couponLimitText").val())
    }
    if (!couponStats.couponCode){
        engageDialog({
            head: "Invalid Configuration",
            body: "No Coupon seems to be selected"
        });
        return;
    }
    if (couponStats.discountType == 2 && couponStats.discountAmount>100){
        engageDialog({
            head: "Invalid Configuration",
            body: "Discount percentage cannot exceed 100"
        });
        return;
    } else if (couponStats.discountType == 1 && couponStats.discountAmount<couponStats.maximumDiscount){
        engageDialog({
            head: "Invalid Configuration",
            body: "Maximum discount cannot exceed discount amount"
        });
        return;
    }
    engageProgress({
        msg: "Updating Coupon "+couponStats.couponCode+"..."
    });
    console.log(couponStats);
    console.log(JSON.stringify(couponStats));           
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-update-coupon-stats",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(couponStats)
    }).done((responseBody) => {                
        dismissDialog();
        console.log(responseBody);
        if (responseBody.statusCode==1){
            M.toast({html: "Coupon Updated!"});
        } else {            
            engageDialog({
                head: "Coudn't update coupon",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Coudn't update coupon",
                body: "Something went wrong"
            });
        }
    });
}

var updateCouponTNC = () => {            
    
    engageProgress({
        msg: "Updating T&C..."
    });    
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-update-coupon-tnc",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            couponCode: $("#couponCodeText").text(),
            tnc: $("#TNCText").val()        
        })
    }).done((responseBody) => {                
        dismissDialog();
        console.log(responseBody);
        if (responseBody.statusCode==1){
            M.toast({html: "Coupon T&C Updated!"});
        } else {            
            engageDialog({
                head: "Coudn't update coupon",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Coudn't update coupon",
                body: "Something went wrong"
            });
        }
    });
}

var updateCouponEligibility = () => {                
    engageProgress({
        msg: "Updating Eligibility..."
    });    
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-update-coupon-eligibility",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            couponCode: $("#couponCodeText").text(),
            elg: $("#ELGText").val()        
        })
    }).done((responseBody) => {                
        dismissDialog();
        console.log(responseBody);
        if (responseBody.statusCode==1){
            M.toast({html: "Coupon Eligbility Updated!"});
        } else {            
            engageDialog({
                head: "Coudn't update coupon",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Coudn't update coupon",
                body: "Something went wrong"
            });
        }
    });
}


