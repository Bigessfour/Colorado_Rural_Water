variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "cors_allow_origins" {
  type    = list(string)
  default = ["http://localhost:4200"]
}
