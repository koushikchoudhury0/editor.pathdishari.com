const BLOG_TYPE_GK = 1, BLOG_TYPE_CA = 1, BLOG_TYPE_OTHER = 3;
const BLOG_NAMES = ["GK", "Current Affair", "Other"];

$(document).ready(() => {
    $("header").load("/content/layout/navbar.html", () => {        
        $("ul.tabs li:eq(5) a").addClass("active");
        $("main").css({"margin-top": $("header").height()});
        $(".slide-out-top").prepend('\
            <div class="row" style="margin: 0; padding: 0; margin: 0">\
                <div class="col s12 primarySelectContainer">\
                    <select id="blogTypeList">\
                        <option disabled selected>Choose Blog Type</option>\
                        <option value="1">GK</option>\
                        <option value="2">Current Affairs</option>\
                        <option value="3">Others</option>\
                    </select>\
                </div>\
            </div>\
        ');
        $("#blogTypeList").on("change", () => {
            $("#blogTypeList").formSelect();
            fetchBlogPreviews($("#blogTypeList").formSelect('getSelectedValues')[0]);            
        });        
        loadMaterialModalPromise(".modalContainer").then(()=>{    
            M.AutoInit();
            $("#fab").floatingActionButton({
                hoverEnabled: false,
                direction: "left"
            });
            $('.characterCountable').characterCounter();
            $(".sidenavHeader").html(`Existing Blogs<i style="margin-right: 10px" class="material-icons">format_quote</i>`);             
            //enlistPackages();   
            //fetchAllExams();  
            //fetchSectors();     
            //$("#dataWindow").modal('open');
        }); 
        //$('.sidenav').sidenav(); 
        var clipboard = new ClipboardJS('#copier');      
        clipboard.on('success', function(e) {
            M.toast({html: "Exam ID Copied"});
            e.clearSelection();
        });
        $("#dataWindow #uploadInput").on('change', ()=>{
            console.log("Handling data Import");
            handleDataImport();
        });
        $("#upcomingInput").on('change', ()=>{
            console.log("Handling data Import");
            handleUpcomingImport();
        });
        /* $("ul.sidenav").append(getBlogBody({
            title: "Wow",
            blogId: "test-123",
            moment: 1582352344811
        })); */
    });
    
});

var createBlog = () => {         
    engageProgress({
        msg: "Creating blog..."
    });    
    $.ajax({
        type: "POST",
        url: "https://5220vu1fsl.execute-api.ap-south-1.amazonaws.com/production/blog/create",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            title: $("#titleText").val(),
            type: parseInt($("#blogTypeList").formSelect('getSelectedValues')[0])
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){
            $("#newWindow").modal('close');
            $("#titleText").val(null);
            M.updateTextFields();                 
            M.toast({html: "Blog Created"});
            $("ul.sidenav").append(getSidenavElementBody(responseBody.blog));
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't create blog",
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
                head: "Couldn't create exam",
                body: "Something went wrong"
            });
        }
    });
}

var getBlogBody = (blog) => {
    return `
    <li>
        <div onclick="fetchBlog(this)" data="${blog.blogId}" class="waves-effect sidenavElement tooltipped" data-tooltip="${blog.title}" data-position="right">
            <a class="blogBodyTitle">${blog.title.substring(0,20)}${blog.title.length>20?'...':''}</a>
            <a class="blogBodyMoment"><span class="material-icons">access_time</span>${(new Date(blog.moment)).toString().split('(')[0]}</a>
        </div>
        <li><div style="margin-top: 0" class="divider"></div></li>
    </li>\
    `;
}

var fetchBlogPreviews = (blogType) => {        
    
    $("#blogTypeText").text(`${BLOG_NAMES[parseInt(blogType)-1]}`);    
    engageProgress({
        msg: `Fetching ${BLOG_NAMES[parseInt(blogType)-1]} Previews ...`
    });
    $.ajax({
        type: "POST",
        url: "https://5220vu1fsl.execute-api.ap-south-1.amazonaws.com/production/blog/fetch/keys",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            type: parseInt(blogType)
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                        
            $(".sidenavElement").remove();
            $(".divider").remove();
            if (responseBody.blogs.length==0){                
                M.toast({html: "No blogs to fetch"});
            } else {                
                responseBody.blogs.forEach((v, i) => {                
                    //$("#examSelector").append("<option>"+v.abbreviation+"</option>");
                    $("ul.sidenav").append(getBlogBody(v));
                });                             
            }
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Cannot fetch blogs",
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
                head: "Cannot fetch blogs",
                body: "Something went wrong."
            });
        }
    });
}

var fetchBlog = (element) => {
    examId = $(element).attr("data");
    $("#blogIdText").text(/* responseBody.exam. */examId);    
    $(".sidenavElement").removeClass("active");
    $(element).addClass("active");
    $("#blogDataTitle").val($(".sidenavElement.active .blogBodyTitle").text());
    M.updateTextFields();
    $("#blogIcon").attr("src", `https://s3.ap-south-1.amazonaws.com/data.pathdishari.com/blog/${examId}/banner`);
    $(".container.placeholder").fadeOut("fast", () => {
        $(".container.primary").fadeIn("fast");
    });    
}

var updateExamData = () => {
    examData = {
        examId: $(".sidenavElement.active").attr("data"),
        name: $("#examDataNameText").val(),
        targetYear: $("#examDataTargetText").val(),
        thresholdMarks: $("#examDataThresholdText").val(),
        totalMarks: $("#examDataMarksText").val(),
        patternYear: $("#examDataPatternText").val(),
        timeout: $("#examDataTimeoutText").val()
    }  
    var allowed = true;
    Object.entries(examData).forEach(([key, value]) => {
        if (value.trim().length==0) allowed = false;
    });
    if (!allowed){
        M.toast({html: "All fields must be filled and an exam must be selected"});
        return;
    }
    engageProgress({
        msg: "Updating Exam..."
    });   
    console.log(examData);
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-exam-data",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(examData)
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                             
            M.toast({html: "Exam Updated"});            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't update exam",
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
                head: "Couldn't update exam",
                body: "Something went wrong"
            });
        }
    });
}

var readImageFromDisk = (input, target = $(input).parent().children("img")) => {
    console.log("reading from disk");
    if (input.files && input.files[0]) {
        var reader = new FileReader();        
        reader.onload = function(e) {
            if (e.target.result.length/1024 > 2048){
                engageDialog({
                    head: "Oops!",
                    body: `Icon Image size cannot exceed <b>2048 KB</b>. Currently it is <b>${parseInt(e.target.result.length/1024)} KB</b>.`
                })
            } else {
                $(target).attr('src', e.target.result);
            }
        }        
        reader.readAsDataURL(input.files[0]);
    }
}

var removeImage = (elem) => {        
    $(elem).parent().parent().children("input").val('');
    $(elem).parent().parent().children("img").attr("src", null);    
}

var chooseImage = (elem) => {
    $(elem).parent().children("input").trigger("click");
}

var getPresignedBannerURL = () => {               
    if ($("#iconInput")[0].files.length != 1){
        M.toast({html: "No new banner chosen"})
        return;
    }
    engageProgress({
        msg: "Requesting access to banner..."
    });       
    $.ajax({
        type: "POST",
        url: "https://5220vu1fsl.execute-api.ap-south-1.amazonaws.com/production/url/sign",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            type: 687,
            path: 3,
            blogId: $("#blogIdText").text()
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                             
            uploadBanner(responseBody.url);            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't update exam",
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
                head: "Couldn't update exam",
                body: "Something went wrong"
            });
        }
    });
}

var uploadBanner = (signedURL) => {
    engageProgress({
        msg: "Uploading banner.."
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
                body: "Something went wrong"
            })
        },
        success: function (response) {            
            dismissDialog();
            M.toast({html: "Banner Updated"});
        }
    });
}

var getSignedContentURL = () => {
    if (!$("#contentInput")[0].files[0]){
        M.toast({html: "No data imported"});
        return;
    }
    engageProgress({
        msg: "Requesting access to content..."
    });
    $.ajax({
        url: "https://5220vu1fsl.execute-api.ap-south-1.amazonaws.com/production/url/sign",
        type: "POST",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            type: 687,
            path: 5,
            blogId: $("#blogIdText").text()
        }),
        contentType: "application/json"        
    }).done((responseBody => {
        dismissDialog();
        if (responseBody.statusCode == 1){    
            console.log("Upload URL retrieved: ", responseBody.url);        
            engageProgress({
                msg: "Uploading data..."
            });
            uploadContentFile(responseBody.url);
        } else {
            engageDialog({
                head: "Cannot update data",
                body: "Something went wrong."
            });
        }
    })).fail((xhr) => {
        console.log("failed: ", xhr.status);
        dismissDialog();
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot update data",
                body: "Something went wrong."
            });
        }
    })    
}

var uploadContentFile = (signedURL) => {
    $.ajax({
        url: signedURL,
        type: 'PUT',
        data: $("#contentInput")[0].files[0],
        contentType: $("#contentInput")[0].files[0].type,
        processData: false,
        cache: false,
        error: function (data) {      
            M.toast({html: "Content Upload Failed"});    
            dismissDialog();  
            console.log(data);             
        },
        success: function (response) {            
            M.toast({html: "Content Uploaded"});
            $("#contentInput").val(null);
            dismissDialog();        
        }
    });
}

