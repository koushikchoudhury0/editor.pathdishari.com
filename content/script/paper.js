class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}


const PAPER_TYPE_MOCK = 1, PAPER_TYPE_SUBJECT = 2;


$(document).ready(() => {
    
    if (!Cookies.get("token")){
        window.location.replace("/");
        return;
    }
    //Common execution for all level 1 pages on admin section
    $("header").load("/content/layout/navbar.html", () => {        
        $("ul.tabs li:eq(1) a").addClass("active");
        $("main").css({"margin-top": $("header").height()});
        $(".slide-out-top").prepend('\
            <div class="row" style="margin: 0; padding: 0; margin: 0">\
                <div class="col s12 sectorSelectContainer">\
                    <select id="sectorList">\
                        <option disabled selected>Choose Sector</option>\
                    </select>\
                </div>\
            </div>\
        ');
        $("#sectorList").on("change", () => {
            $("#sectorList").formSelect();
            fetchExams($("#sectorList").formSelect('getSelectedValues')[0]);
        });
        $(".subheader").html("Existing Exams<i style=\"margin-right: 10px\" class='material-icons'>format_shapes</i>"); 
        /*$(".sidenav").on("click", "#test", () => {
            console.log($(this).parent().prop);            
            //$(this).css({"display": "none"});
        })*/
        loadMaterialModalPromise(".modalContainer").then(() => {
            M.AutoInit();
            $('.characterCountable').characterCounter(); 
            fetchSectors();
            //fetchExams();           
            setYearList();            
            /*
            For Testing Sidenav elements
            $("ul.sidenav").append(getSidenavElementBody("test", "test"));
            $("ul.sidenav").append(getSidenavElementBody("test2", "test2"));
            */
        });        
    });

    
    
});

var fetchSectors = () => {
    console.log("fetching sectors");
    engageProgress({
        msg: "Fetching Sectors ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-sectors",
        headers: {
            "Authorization": Cookies.get("token")
        }
    }).done((responseBody) => {        
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            dismissDialog();
            $("#sectorList").empty();
            $("#sectorList").append("<option disabled selected>Choose Sector</option>");
            if (responseBody.sectors.length==0){                
                M.toast({html: "No Sectors to fetch"});
            } else {                                
                responseBody.sectors.forEach((v, i) => {    
                    console.log("Adding: ", v.sectorName);                                                    
                    $("#sectorList").append("<option data='"+v.sectorName+"'>"+v.sectorName+"</option>");
                });                                             
            }
            $("#sectorList").formSelect();
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
                head: "Cannot fetch sectors",
                body: "Something went wrong."
            });
        }
    });
}

var setYearList = (presentYear = parseInt(new Date().getFullYear())) => {
    
    $("#viewYearSelect").html("");
    $("#createYearSelect").html("");
    for (var i=presentYear-10; i<presentYear; i++){
        $("#viewYearSelect").append("<option value=\""+i+"\">"+i+"</option>");
        $("#createYearSelect").append("<option value=\""+i+"\">"+i+"</option>");     
    }
    $("#viewYearSelect").append("<option selected value=\""+i+"\">"+i+"</option>");
    $("#createYearSelect").append("<option selected value=\""+i+"\">"+i+"</option>");     
    for (var i=presentYear+1; i<=presentYear+10; i++){
        $("#viewYearSelect").append("<option value=\""+i+"\">"+i+"</option>");
        $("#createYearSelect").append("<option value=\""+i+"\">"+i+"</option>");     
    }
    $("#viewYearSelect").formSelect();
    $("#createYearSelect").formSelect();
    
}

var typeSelect = (elem) => {
    switch($(elem).attr("id")){
        case "typeMock":
            $(".paperModelContainer").hide();
            break;
        case "typeSubject":
            console.log("sbject");
            $(".paperModelContainer").show();
            break;
    }
}

var fetchExams = (sectorName) => {
    console.log("fetching exam names for sector: ", sectorName);
    engageProgress({
        msg: "Fetching exams ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-exam-names",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            sectorName: sectorName
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            dismissDialog();
            $(".sidenavElement").remove();
            if (responseBody.examNames.length==0){                
                M.toast({html: "No exams to fetch"});
            } else {                
                responseBody.examNames.forEach((v, i) => {                
                    //$("#examSelector").append("<option>"+v.abbreviation+"</option>");
                    $("ul.sidenav").append(getSidenavElementBody(v.examId, v.abbreviation));
                });                             
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

var createPaper = () => {
    $("#createYearSelect").formSelect();
    paperData = {
        examId: $("#selectedExamId").attr("value"),
        paperName: $("#paperNameText").val(),        
        paperType: $("#typeMock").prop("checked")?PAPER_TYPE_MOCK:PAPER_TYPE_SUBJECT,
        modelName: $("#paperModelText").val(),
        modelQuestionCount: $("#paperModelQuestionCount").val(),
        modelTimeout: $("#paperModelTime").val(),
        modelMarks:$("#paperModelMarks").val(),
        targetYear: parseInt($("#createYearSelect").formSelect('getSelectedValues')[0]),
        isFree: $("#freeCheckbox").prop("checked")?1:0,
        publicationDate: $("#pubDate").val()
    }
    console.log(paperData, "Validating.....");    
    try{
        if (paperData.examId.length<60) throw new ValidationError("Exam Id is invalid");
        if (paperData.paperName.trim().length<5 /*|| !new RegExp("^[0-9A-Z\. a-z]+$").test(paperData.paperName)*/) throw new ValidationError("Paper name should be more than 5 characters and only contain alphanumeric characters");
        if (paperData.paperTimeout < 1) throw new ValidationError("Timeout should be positive");
        if (paperData.paperType<0 || paperData.paperType>2 ) throw new ValidationError("Invalid type");        
        if (paperData.paperType==2) if (paperData.modelName.trim().length<5 /*|| !new RegExp("^[0-9A-Z\. a-z]+$").test(paperData.modelName)*/) throw new ValidationError("Model name should be more than 5 characters and only contain alphanumeric characters.");
        if (paperData.paperType==2) if (paperData.modelQuestionCount < 1 || paperData.modelQuestionCount > 100) throw new ValidationError("No.of question should be positive with a maximum of 100");
        if (paperData.targetYear<2000) throw new ValidationError("Year more than 2000 must be specified");
        if (paperData.isFree<0 || paperData.isFree>1) throw new ValidationError("Cost of this paper is left undecided");
        if (!paperData.publicationDate) throw new ValidationError("Expected Publication Date must be chosen");
    } catch (err) {
        console.log(err);
        engageDialog({
            head: "Invalid Paper Configured!",
            body: (err instanceof ValidationError)?err.message:"Something went terribly wrong! Contact the administrators"
        });
        return;
    }    
    /*if (!isNewPaperDataValid(paperData)){
        console.log("Illegal New Content");
        engageDialog({
            head: "Cannot create Paper",
            body: "Paper data is not valid. Please make sure that you've entered both <b>Exam name</b> and <b>Paper name</b>"
        });
        return;   
    }*/
    
    
    console.log("Creating Paper..");
    var requestBody = 
    engageProgress({
        msg: "Creating new paper ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/create-paper",
        data: JSON.stringify(paperData),
        headers: {
            "Authorization": Cookies.get("token")
        }
    }).done((responseBody) => {  
        console.log(responseBody);                      
        if (responseBody.statusCode==1){            
            $("#inputContainer").modal('close');
            dismissDialog();
            $("#paperList li:eq(0)").after(getPaperBody(responseBody.createdPaper));
            M.AutoInit();
            M.toast({html: 'Paper created'});
            //remove data from input fields
            $("#paperNameText").val("");   
            M.updateTextFields();
            $('.characterCountable').characterCounter();             
            //add data to list
        } else {
            engageDialog({
                head: "Cannot create paper",
                body: responseBody.cause==300?"Paper with same name for chosen exam already exists":200?"Invalid components were provided":"Something went wrong"
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

var fetchPapers = (examId/* = $(".sidenavElement.active")*/, targetYear/*=$(".viewYearSelectContainer input").val()*/, examAbbreviation) => {
    console.log("Fetching paers");
    engageProgress({
        msg: "Fetching "+examAbbreviation+" papers for "+targetYear+" ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-paper-names-by-exam-name",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            examId: examId,
            targetYear: targetYear
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            dismissDialog();
            if (responseBody.paperList.length==0){                
                M.toast({html: examAbbreviation+" has no existing papers for "+targetYear});                
            }
            $("#paperList").empty().append('<li class="collection-header"><h4>Existing Papers</h4></li>').css({"visibility": "visible"});                
            responseBody.paperList.forEach((v, i) => {      
                console.log(v.creation);                              
                $("#paperList").append(getPaperBody(v).toString());
                M.AutoInit();
                console.log(v);
            });
            $("#fab").fadeIn();
            $(".container.placeholder").fadeOut("fast", () => {
                $(".container.primary").fadeIn("fast");
            });
            $(".tooltipped").tooltip();
            $(".datepicker").datepicker({
                container: "body",
                format: "d mmmm yyyy"
            });
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
                head: "Cannot fetch papers",
                body: "Something went wrong."
            });
        }
    });
}

var isNewPaperDataValid = (paperData) => {
    try{
        if (paperData.examId.length<60) throw new ValidationError("Exam Id is invalid");
        if (paperData.paperName.trim().length<5 || !new RegExp("^[0-9A-Z\. a-z]+$").test(paperData.paperName)) throw new ValidationError("Paper name should be more than 5 characters and only contain alphanumeric characters");
        if (paperData.paperTime < 1) throw new ValidationError("Timeout should be positive");
        if (paperData.paperType<0 || paperData.paperType>2 ) throw new ValidationError("Invalid type");
        if (paperData.modelName.trim().length<5 || !new RegExp("^[0-9A-Z\. a-z]+$").test(paperData.modelName)) throw new ValidationError("Model name should be more than 5 characters and only contain alphanumeric characters");
    } catch (err) {
        console.log(err);
        return false;
    }
    /*var str = $("#paperNameText").val();
    if (!(!str?false:str.trim().length>1?true:false)){
        console.log("hey");
        return false;    
    }     
    if (!new RegExp("^[0-9A-Z\. a-z]+$").test(str)) return false;
    //if (!new RegExp("[^\-]$").test(str)) return false;
    //if (!new RegExp("^[^\-]").test(str)) return false;
    */    
    return true;
}

var getPaperBody = (paper) => {
    /*return '\
    <li class="collection-item">\
        <div>'+paper.paperName+'\
            <a  class="secondary-content waves-effect composeNavigater tooltipped" data-tooltip="Edit Questions" href="./makePaper.html?paperId='+paper.paperId+'" target="_blank">\
                <i class="material-icons">edit</i>\
            </a>\
        </div>\
        <div>\
        <p class="paperConfigData"><span class="customBadge paperType">'+(paper.paperType==1?'mock':'model')+'</span><span class="customBadge paperCost">'+(paper.isFree==1?'free':'paid')+'</span></p>\
        </div>\
    </li>'*/
    return paper.published==0?'<li class="collection-item paperItem">\
        <div class="paperItemChild"  style="overflow: visible">\
            <div>'+paper.paperName+'\
                <a  class="secondary-content waves-effect composeNavigater dropdown-trigger" data-target="'+paper.paperId+'">\
                    <i class="material-icons">more_vert</i>\
                </a>\
            </div>\
            <ul id="'+paper.paperId+'" class="dropdown-content">\
                <li><a class="dropdownText" target="_blank" href="./makePaper.html?paperId='+paper.paperId+'">Manage Questions</a></li>\
                <li><a class="dropdownText expendable" href="#!" onclick="publishPaper(this, \''+paper.paperId+'\', \''+paper.paperName+'\')">Publish Now</a></li>\
            </ul>\
            <div>\
            <p class="paperConfigData"><span class="customBadge paperType">'+(paper.paperType==1?'mock':'topic wise')+'</span><span class="customBadge paperCost">'+(paper.isFree==1?'free':'paid')+'</span><span class="customBadge paperStatus">'+(paper.published==1?'published':'draft')+'</span></p>\
            </div>\
        </div>\
    </li>':'<li class="collection-item paperItem">\
        <div class="paperItemChild"  style="overflow: visible">\
            <div>'+paper.paperName+'\
                <a  class="secondary-content waves-effect composeNavigater dropdown-trigger" data-target="'+paper.paperId+'">\
                    <i class="material-icons">more_vert</i>\
                </a>\
            </div>\
            <ul id="'+paper.paperId+'" class="dropdown-content">\
                <li><a class="dropdownText" target="_blank" href="./makePaper.html?paperId='+paper.paperId+'">Manage Questions</a></li>\
            </ul>\
            <div>\
            <p class="paperConfigData"><span class="customBadge paperType">'+(paper.paperType==1?'mock':'topic wise')+'</span><span class="customBadge paperCost">'+(paper.isFree==1?'free':'paid')+'</span><span class="customBadge paperStatus">'+(paper.published==1?'published':'draft')+'</span></p>\
            </div>\
        </div>\
    </li>'
}

var publishPaper = (element, paperId, paperName) => {
    console.log("Publishing paper with id: ", paperId);
    try{
        if (paperId.length<60) throw new ValidationError("Insuffcoent PaperId length");
    } catch (err) {
        engageDialog({
            head: "Oops!",
            body: "Something is off about this paper. Refresh and try again after a few momoents, if the problem perists contact the Administrators"
        });
        return;
    }
    engageProgress({
        msg: "Publishing "+paperName    
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/publish-paper",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            paperId: paperId
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            dismissDialog();
            M.toast({html: "Paper published"});
            $(element).closest(".paperItemChild").find(".paperStatus").text("Published");
            $(element).parent().remove();
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Oops!",
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
                head: "Cannot publish",
                body: "Something went wrong."
            });
        }
    });
}

var getSidenavElementBody = (examId, examAbbreviation) => {
    return '\
    <li>\
        <div onclick="startFetchingPapers(this, \''+examId+'\', \''+examAbbreviation+'\')" class="waves-effect sidenavElement">\
            <a class="examAbbreviation">'+examAbbreviation+'</a>\
        </div>\
        <li><div style="margin-top: 0" class="divider"></div></li>\
    </li>\
    ';
}

var startFetchingPapers = (element, examId, examAbbreviation) => {    
    $(".sidenavElement").removeClass("active");
    $(element).addClass("active");
    $("#examNamePreview").text(examAbbreviation);
    $("#examNamePreview2").text(examAbbreviation);
    $("#inputContainer #selectedExamId").attr("value", examId);        
    $("#viewYearSelect").formSelect();    
    fetchPapers(examId, $("#viewYearSelect").formSelect('getSelectedValues')[0], examAbbreviation);    
}

var triggerFetchPaper = () => {
    $(".sideNavElement.active").trigger("click");
}
