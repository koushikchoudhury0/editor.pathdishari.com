var selectedPackageId, selectedPackageName;

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

$(document).ready(() => {
    $("header").load("/content/layout/navbar.html", () => {        
        $("ul.tabs li:eq(2) a").addClass("active");
        $("main").css({"margin-top": $("header").height()});
        /*$(".slide-out-top").append('\
        <div class="switch" style="padding-left: 25px; line-height: 0; transform: translateY(-10px)">\
            <label style="font-family: Varela">\
                Show only unpublished\
                <input type="checkbox">\
                <span class="lever"></span>\
            </label>\
        </div>');*/
        //$("#slide-out").append('<li><div class="divider"></div></li>');
        loadMaterialModalPromise(".modalContainer").then(()=>{
            M.AutoInit();
            $('.characterCountable').characterCounter();
            $(".sidenavHeader").html('Existing Packages'); 
            fetchSectors();     
        }); 
        //$('.sidenav').sidenav();       
    });
});

var fetchExams = (src, dest) => {
    $(src).formSelect();
    console.log("fetching exam names");
    engageProgress({
        msg: "Fetching exams for Sector  "+$(src).formSelect('getSelectedValues')[0]+"..."
    });    
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-exam-names",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            sectorName: $(src).formSelect('getSelectedValues')[0]
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            dismissDialog();
            $(dest).empty().append('<option value="" disabled selected>Choose an exam to associate</option>');       
            if (responseBody.examNames.length==0){                
                M.toast({html: "No exams to fetch"});
            } else {                
                responseBody.examNames.forEach((v, i) => {                                    
                    $(dest).append("<option data='"+JSON.stringify(v)+"'>"+v.abbreviation+"</option>");                    
                });                    
                $(dest).formSelect();
            }
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Cannot fetch any more!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot fetch exams",
                body: "Something went wrong."
            });
        }
    });
}

var fetchSectors = () => {
    console.log("fetching sectors");
    engageProgress({
        msg: "Fetching sectors ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-sectors",
        headers: {
            "Authorization": Cookies.get("token")
        }
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                        
            $("#sectorList").empty().append('<option disabled selected>Choose Sector</option>');
            $("#creationSectorList").empty().append('<option disabled selected>Choose Sector</option>');                        
            if (responseBody.sectors.length==0){                
                M.toast({html: "No sectors to fetch"});                
            } else {                
                responseBody.sectors.forEach((v, i) => {                                    
                    $("#sectorList").append("<option data='"+v.sectorName+"'>"+v.sectorName+"</option>");
                    $("#creationSectorList").append("<option data='"+v.sectorName+"'>"+v.sectorName+"</option>");
                });    
                $("#sectorList").formSelect();
                $("#creationSectorList").formSelect();                
                fetchAllPackages();
            }            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Cannot fetch any more!",
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
                head: "Cannot fetch exams",
                body: "Something went wrong."
            });
        }
    });
}

var createPackage = () => {
    var exams = [];
    $.each($("#creationChipContainer .chip"), function (index, value) {
        exams.push({
            examId: $(value).attr("key"),
            abbreviation: $(value).attr("data")
        });
    });
    var packageData = {
        packageName: $("#packageNameText").val(),
        price: Number($("#packagePriceText").val()),
        exams: exams,
        description: $("#packageCreationDescText").val(),
        mockPapers: Number($("#packageCreationMockText").val()),
        modelPapers: Number($("#packageCreationModelText").val()),
        questionCount: Number($("#packageCreationQsnText").val())
    };
    
    try {
        console.log(packageData.exams.length);
        if (packageData.packageName.trim().length<5 || (!new RegExp("^[0-9A-Z a-z]+$").test(packageData.packageName))) throw new ValidationError("Package name must follow the rules and be non empty");
        if (packageData.price<10) throw new ValidationError("Price must atleast be Rs. 10");
        if (packageData.exams.length<1)  throw new ValidationError("Atleast 1 exam must be associated");
        if (packageData.description.length<10) throw new ValidationError("You'll need to describe this package briefly");
    } catch (err) {
        console.log(err);
        engageDialog({
            head: "Invalid Package Configured!",
            body: (err instanceof ValidationError)?err.message:"Something went terribly wrong! Contact the administrators"
        });
        return;
    }
    console.log("Requesting Package Creation with: ", packageData);
    
    /*if (!isNewPackageDataValid(packageName)){
        engageDialog({
            head: "Oops!",
            body: "Package Data is not valid. Avoid using any symbols in package name and use only numbers in price."
        });
        return false;
    }*/
    //$("#inputContainer").modal('close');
    engageProgress({
        msg: "Creating Package...."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/create-package",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(packageData)
    }).done((responseBody) => {
      console.log(responseBody);  
      if (responseBody.statusCode==1){            
        //show toast
        dismissDialog();
        $("#slide-out li:eq(1)").prepend(getPackageBody(responseBody.createdPackage));
        $(".sidenavElement").tooltip();
        M.toast({html: 'Package created'});
        //remove data from input fields
        $("#packageNameText").val("");
        $("#packagePriceText").val("");
        $("#packageCreationDescText") .val("");
        $("#creationChipContainer").empty();
        $("#creationExamList").prop("selectedIndex", 0);
        $("#creationSectorList").prop("selectedIndex", 0);  
        M.updateTextFields();
        $('.characterCountable').characterCounter();  
        $("#inputContainer").modal("close");           
        //add data to list
    } else {
        engageDialog({
            head: "Cannot create package",
            body: responseBody.cause==300?"Package with same name already exists":200?"Invalid data were provided":"Something went wrong"
        });
    }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Oops!",
                body: "Something went wrong."
            });
        }
    });
}

/*var isNewPackageDataValid = () => {
    var str = $("#packageNameText").val();
    if (str?false:str.trim().length>1) return false;
    if (!new RegExp("^[0-9A-Z a-z]+$").test(str)) return false;        
    return true;
}*/

/*var startFetchingPackage = (element) => {    
    
    fetchPackage(selectedPackageId);    
}*/

var getPackageBody = (v) => {
    return '\
        <li>\
            <div onclick="fetchPackage(this)" data=\''+JSON.stringify(v)+'\' class="waves-effect sidenavElement tooltipped" data-tooltip="'+v.packageName+'" data-position="right">\
                <div class="packageName"><a>'+v.packageName+'</a></div>\
                <div  class="packageData">\
                    <a class="packageExamCount">Exams&nbsp;&nbsp;&nbsp;<span class="customBadge">'+v.examCount+'</span>'+((v.popularity==1)?'<i class="material-icons starBadge">star</i>':'')+'</a>\
                </div>\
                <a style="margin-top: 0; margin-bottom: 0px; padding-top: 0; padding-bottom: 20px; font-size: 10px; color: #757575"><span style="font-size: 14px; margin-right: 10px; transform: translateY(3px);" class="material-icons">access_time</span>'+(new Date(v.creation)).toString().split('(')[0]+'</a>\
            </div>\
            \
        </li><li><div style="margin: 0" class="divider"></div></li>';
}

var fetchAllPackages = (paginateKeyJSON) => {
    engageProgress({
        msg: "Fetching Packages"
    });    
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-package-keys",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            //no data
        })
    }).done((responseBody) => {
        if (responseBody.statusCode==1){            
            //show toast
            dismissDialog();
            $("#paginateButton").remove();
            if (responseBody.packages.length == 0) {
                M.toast({html: "No Packages to fetch"});
                return;
            }
            responseBody.packages.forEach((v, i) => {
                $("#slide-out").append(getPackageBody(v));
                //console.log("Appending:", v);
            });
            if (responseBody.exclusiveStartKey){
                $("#slide-out").append(`<li id="paginateButton"><p style="margin-top: 0; text-align: center; cursor: pointer; color: navy" onclick=fetchNextPackages('${JSON.stringify(responseBody.exclusiveStartKey)}')>Load More</p></li>`);
            }
            $(".sidenavElement").tooltip();            
        } else {
            engageDialog({
                head: "Cannot read packages",
                body: "Something went wrong"
            });
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Oops!",
                body: "Something went wrong."
            });
        }
    });
}

var fetchNextPackages = (paginateKeyJSON) => {
    engageProgress({
        msg: "Fetching more Packages...."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-package-keys",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            exclusiveStartKey: JSON.parse(paginateKeyJSON)
        })
    }).done((responseBody) => {
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            //show toast
            dismissDialog();
            $("#paginateButton").remove();
            if (responseBody.packages.length == 0) {
                M.toast({html: "No Packages to fetch"});
                return;
            }
            responseBody.packages.forEach((v, i) => {
                $("#slide-out").append(getPackageBody(v));
                //console.log("Appending:", v);
            });
            if (responseBody.exclusiveStartKey){
                $("#slide-out").append(`<li id="paginateButton"><p style="margin-top: 0; text-align: center; cursor: pointer; color: navy" onclick=fetchNextPackages('${JSON.stringify(responseBody.exclusiveStartKey)}')>Load More</p></li>`);
            }
            $(".sidenavElement").tooltip();            
        } else {
            engageDialog({
                head: "Cannot read packages",
                body: "Something went wrong"
            });
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Oops!",
                body: "Something went wrong."
            });
        }
    });
}

/*
var showConfig = () => {
    $("#packageControl").fadeOut("fast", () => {
        $("#packageConfig").fadeIn(); 
    });
}

var showControl = () => {
    $("#packageConfig").fadeOut("fast", () => {
        $("#packageControl").fadeIn(); 
    });
}*/

var fetchPackage = (element) => {
    $(".sidenavElement").removeClass("active");    
    //selectedPackageId = $(element).find(".packageId").attr("data");
    //selectedPackageName = $(element).find(".packageName").attr("data");
    const packageData = JSON.parse($(element).attr("data"));
    //console.log("Requesting: ", packageData.packageName);
    //Clear Fields
    $("#chipContainer").empty();
    $("#packageDataPriceText").val(null);
    $("#packageDataQsnText").val(null);
    $("#packageDataDescText").val(null);
    $("#packageDataMockText").val(null);
    $("#packageDataModelText").val(null);
    $("#packagePopularity")
        .css({"color": "grey"})
        .attr("data-tooltip", "Package Popularity")
        .attr("onclick", "");
    M.updateTextFields();
    $("#sectorList").prop('selectedIndex', 0).formSelect();
    engageProgress({
        msg: "Reading Package "+packageData.packageName+"..."
    });
    //Start Request
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-package",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            packageId: packageData.packageId
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            dismissDialog();
            $(element).addClass("active");
            if (!responseBody.package){                
                M.toast({html: "Package Data has been removed. Contact the administrators immediately"});
            } else {   
                //Setting Data                
                $("#packageIdText").text(responseBody.package.packageId);
                $("#iconInput").val(null);
                $("#iconImg").attr("src", `https://s3.ap-south-1.amazonaws.com/data.pathdishari.com/package/${responseBody.package.packageId}/icon.picture`);                
                $("#packageDataPriceText").val(Number(responseBody.package.price));
                $("#packageDataQsnText").val(Number(responseBody.package.questionCount));
                $("#packageDataMockText").val(responseBody.package.mockPapers);
                $("#packageDataModelText").val(responseBody.package.modelPapers);                                   
                $("#packageDataDescText").val(responseBody.package.description);
                responseBody.package.exams.forEach((v, i) => {
                    $("#chipContainer").append(getChipBody(v));                    
                    //console.log(v);
                });                                                
                /*if (published) $("#associateExamButtonContainer").css({"display": "none"});   
                else $("#associateExamButtonContainer").css({"display": "block"});*/
                if (responseBody.package.popularity == 1){
                    $("#packagePopularity")
                        .css({"color": "rgb(238, 134, 15)"})
                        .attr("data-tooltip", "Depopularize this Package")
                        .attr("onclick", "updatePackagePopularity(1, \""+responseBody.package.packageId+"\")")
                } else {
                    $("#packagePopularity")
                        .css({"color": "grey"})
                        .attr("data-tooltip", "Popularalize this package")
                        .attr("onclick", "updatePackagePopularity(0, \""+responseBody.package.packageId+"\")");
                }
                M.updateTextFields();
                $(".placeholder").hide();
                $(".container.primary").show();
            }
        } else {
            //console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Oops!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        //console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Oops!",
                body: "Something went wrong."
            });
        }
    });
};


var updateAssociatedExamList = () => {
    //console.log("selected: "+$(element).attr("data"));
    //console.log(element);
    $("#examList").formSelect();
    //console.log("selected: "+$("#examList").find(":selected").attr("data"));
    exam = JSON.parse($("#examList").find(":selected").attr("data"));
    //console.log($(element).find())    
    var found = false;        
    /*associatedExamList.forEach((v, i) => {        
        if (v.examName==exam.examName){ found = true; }        
    });
    if (!found){
        associatedExamList.push(exam);
        $("#chipContainer").append(getChipBody(exam.alias));            
    }*/    
    $.each($("#chipContainer .chip"), function (index, value) {
        if (exam.examId == $(value).attr("key")){
            found = true;
            console.log("Selected exam is already in the list");
        } 
    });
    if (!found) {
        selectedPackage = JSON.parse($(".sidenavElement.active").attr("data"));
        engageProgress({
            msg: "Associating Exam..."
        });
        $.ajax({
            type: "POST",
            url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-package-add-exam",
            headers: {
                "Authorization": Cookies.get("token")
            },
            data: JSON.stringify({
                packageId: selectedPackage.packageId,
                exam: exam
            })
        }).done((responseBody) => {        
            if (responseBody.statusCode == 1){
                $("#chipContainer").append(getChipBody(exam));
                console.log("Present Count: ", $(".sidenavElement.active .packageData .packageExamCount .customBadge").val());
                $(".sidenavElement.active .packageData .packageExamCount .customBadge").html(Number($(".sidenavElement.active .packageData .packageExamCount .customBadge").html()) + 1);
                M.toast({html: "Exam associated"});
                dismissDialog();
            } else if (responseBody.cause == 351){
                console.log("Exam is already associated");
                M.toast({html: "Exam was already associated"});
                $("#chipContainer").append(getChipBody(exam));
            } else {
                engageDialog({
                    head: "Oops!",
                    body: !responseBody.cause?"Something went wrong":responseBody.cause==200?"Something went wrong with the chosen exam":"Something went wrong"
                });
            }
        }).fail((xhr) => {
            console.log("failed: ", xhr.status);
            if (xhr.status === 403 || xhr.status === 401){
                Cookies.remove("token");
                window.location.replace("/");
            } else {
                engageDialog({
                    head: "Oops!",
                    body: "Something went wrong."
                });
            }
        });
    }
    $("#examList").prop("selectedIndex", 0);
    $("#examList").formSelect();    
};

var updateCreationAssociatedExamList = () => {
    //console.log("selected: "+$(element).attr("data"));
    //console.log(element);
    $("#creationExamList").formSelect();
    //console.log("selected: "+$("#examList").find(":selected").attr("data"));
    exam = JSON.parse($("#creationExamList").find(":selected").attr("data"));
    //console.log($(element).find())    
    var found = false;        
    /*associatedExamList.forEach((v, i) => {        
        if (v.examName==exam.examName){ found = true; }        
    });
    if (!found){
        associatedExamList.push(exam);
        $("#chipContainer").append(getChipBody(exam.alias));            
    }*/    
    $.each($("#creationChipContainer .chip"), function (index, value) {
        if (exam.examId == $(value).attr("key")){
            found = true;
            console.log("Selected exam is already in the list");
        } 
    });
    if (!found) $("#creationChipContainer").append(getChipBody(exam));
    $("#creationExamList").prop("selectedIndex", 0);
    $("#creationExamList").formSelect();
};

var getChipBody = (exam, closure = true) => {
    return '\
    <div class="chip" key="'+exam.examId+'" data="'+exam.abbreviation+'">'+
        exam.abbreviation+'<i onclick="unassociateExam(\''+exam.examId+'\', \''+exam.abbreviation+'\')" class="close material-icons">close</i>'+
    '</div>';
}

/*var associateExam = () => {
    var list = [];
    $.each($("#chipContainer .chip"), function (index, value) {
        list.push({
            examId: $(value).attr("key"),
            abbreviation: $(value).attr("data")
        });
    });
    console.log("Associating List: ", list);
    return;
    engageProgress({
        msg: "Associating Exams..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-package-add-exam",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            packageName: selectedPackageName,
            examList: list
        })
    }).done((responseBody) => {        
        if (responseBody.statusCode == 1){
            M.toast({html: "Exams Associated"});
            dismissDialog();
        } else {
            engageDialog({
                head: "Oops!",
                body: !responseBody.cause?"Something went wrong":responseBody.cause==200?"Something went wrong with the chosen exams":"Something went wrong"
            });
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Oops!",
                body: "Something went wrong."
            });
        }
    });

}*/

var unassociateExam = (examId, abbreviation) => {
    //console.log("deleting: ", examId, abbreviation);
    //console.log($(".sidenavElement.active").attr("data"));         
    exam = {
        examId: examId,
        abbreviation: abbreviation
    }    
    if ($("#chipContainer").children().length<=1){
        console.log("Cannot remove the last exam");
        $("#chipContainer").append(getChipBody(exam));
        engageDialog({
            head: "Oops!",
            body: "Atleast 1 exam is required to remain associated"
        });
        return;
    }
    selectedPackage = JSON.parse($(".sidenavElement.active").attr("data"));
    engageProgress({
        msg: "Disassociating Exam..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-package-delete-exam",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            packageId: selectedPackage.packageId,
            exam: exam
        })
    }).done((responseBody) => {        
        if (responseBody.statusCode == 1){            
            $(".sidenavElement.active .packageData .packageExamCount .customBadge").html(Number($(".sidenavElement.active .packageData .packageExamCount .customBadge").html()) - 1);
            M.toast({html: "Exam unassociated"});
            dismissDialog();
        } else {                        
            $("#chipContainer").append(getChipBody(exam));
            engageDialog({
                head: "Oops!",
                body: !responseBody.cause?"Something went wrong":responseBody.cause==200?"Something went wrong with the chosen exam":responseBody.cause==353?"Atleast 1 exam is required to remain associated":"Something went wrong"
            });
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Oops!",
                body: "Something went wrong."
            });
        }
    });
}

var updatePackageData = () => {
    engageProgress({
        msg: "Updating Package"
    });
    updateData = {
        packageId: JSON.parse($(".sidenavElement.active").attr("data")).packageId,
        price: Number($("#packageDataPriceText").val()),
        questionCount: Number($("#packageDataQsnText").val()),
        mockPapers: Number($("#packageDataMockText").val()),
        modelPapers: Number($("#packageDataModelText").val()),
        description: $("#packageDataDescText").val()
    }
    console.log(updateData);
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-package-data",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(updateData)
    }).done((responseBody) => {
      console.log(responseBody);  
      if (responseBody.statusCode==1){                    
        dismissDialog();
        M.toast({html: 'Package updated'});        
    } else {
        engageDialog({
            head: "Cannot update package",
            body: "Invalid data were provided"
        });
    }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            dismissDialog();
            engageDialog({
                head: "Oops!",
                body: "Something went wrong."
            });
        }
    });

}

//

var updatePackagePopularity = (currentPopularity, packageId) => {
    engageProgress({
        msg: "Updating Package"
    });        
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-update-package-popularity",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            packageId: packageId,
            popularity: currentPopularity
        })
    }).done((responseBody) => {
      console.log(responseBody);  
      if (responseBody.statusCode==1){                    
        dismissDialog();        
        if (currentPopularity==0){
            M.toast({html: 'Package Popularized'});
            $("#packagePopularity")
                .css({"color": "rgb(238, 134, 15)"})
                .attr("data-tooltip", "Depopularize this package")
                .attr("onclick", "updatePackagePopularity(1, \""+packageId+"\")");
            $(".sidenavElement.active .packageExamCount").append('<i class="material-icons starBadge">star</i>');
        } else {
            M.toast({html: 'Package Depopularized'});
            $("#packagePopularity")
                .css({"color": "grey"})
                .attr("data-tooltip", "Popularize this package")
                .attr("onclick", "updatePackagePopularity(0, \""+packageId+"\")");
            $(".sidenavElement.active .starBadge").remove();
        }     
    } else {
        engageDialog({
            head: "Cannot update package",
            body: "Invalid data were provided"
        });
    }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            dismissDialog();
            engageDialog({
                head: "Oops!",
                body: "Something went wrong."
            });
        }
    });

}

var removeImage = (elem) => {        
    $(elem).parent().parent().children("input").val('');
    $(elem).parent().parent().children("img").attr("src", defaultSrc);    
}

var chooseImage = (elem) => {
    $(elem).parent().children("input").trigger("click");
}

var readImageFromDisk = (input, target = $(input).parent().children("img")) => {
    console.log("reading from disk");
    if (input.files && input.files[0]) {
        var reader = new FileReader();        
        reader.onload = function(e) {
            if (e.target.result.length/1024 > 100){
                engageDialog({
                    head: "Oops!",
                    body: `Icon Image size cannot exceed <b>100 KB</b>. Currently it is <b>${parseInt(e.target.result.length/1024)} KB</b>.`
                })
            } else {
                $(target).attr('src', e.target.result);
            }
        }        
        reader.readAsDataURL(input.files[0]);
    }
}

var getPresignedIconURL = () => {               
    if ($("#iconInput")[0].files.length != 1){
        M.toast({html: "There aren't any new icon chosen"});
        return;
    }
    engageProgress({
        msg: "Requesting access..."
    });       
    $.ajax({
        type: "POST",
        url: "https://5220vu1fsl.execute-api.ap-south-1.amazonaws.com/production/url/sign",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            type: 687,
            path: 6,
            packageId: $("#packageIdText").text()
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                             
            uploadIcon(responseBody.url);            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't update package",
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
                head: "Couldn't update package",
                body: "Something went wrong"
            });
        }
    });
}

var uploadIcon = (signedURL) => {
    engageProgress({
        msg: "Updating package icon.."
    });
    $.ajax({
        url: signedURL,
        type: 'PUT',
        data: $('#iconInput')[0].files[0],
        contentType: $('#iconInput')[0].files[0].type,
        processData: false,
        cache: false,
        error: function (data) {      
            dismissDialog();
            engageDialog({
                head: "Oops!",
                body: "Something went wrong. Try reloading this page."
            })
        },
        success: function (response) {            
            dismissDialog();
            $("#iconInput").val(null);
            M.toast({html: "Package Updated!"});
        }
    });
}