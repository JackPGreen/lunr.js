lunr.Index = function (attrs) {
  this.invertedIndex = attrs.invertedIndex
  this.documentVectors = attrs.documentVectors
  this.tokenSet = attrs.tokenSet
  this.documentCount = attrs.documentCount
  this.averageFieldLengths = attrs.averageFieldLengths
  this.b = attrs.b
  this.k1 = attrs.k1
}

lunr.Index.prototype.search = function (query, fieldName) {
  // pass the query through a pipeline
  // find all the matching terms from the tokenSet
  // build a query vector
  // grab all relevant document vectors
  // score and sort

  // TODO: set up index tokenizer/pipeline

  var fieldName = fieldName || "ALL" // just searching all fields at the moment

  var queryTokenSet = lunr.TokenSet.fromString(query),
      queryTerms = this.tokenSet.intersect(queryTokenSet).toArray(),
      queryVector = new lunr.Vector,
      matchingDocumentRefs = {},
      results = []

  for (var i = 0; i < queryTerms.length; i++) {
    var term = queryTerms[i],
        posting = this.invertedIndex[term],
        termIdf = this.idf(term, fieldName),
        weight = 1 / ((( 1 - this.b) + this.b) * (queryTerms.length / this.averageFieldLengths[fieldName])),
        score = termIdf * weight / this.k1 + weight,
        termIndex = posting.index

    queryVector.insert(termIndex, score)

    if (fieldName == "ALL") {
      for (var field in posting) {
        var fieldPosting = posting[field]

        for (var docRef in fieldPosting) {
          if (docRef == "idf" || docRef in matchingDocumentRefs) continue
          matchingDocumentRefs[docRef] = true
          results.push({
            ref: docRef,
            score: queryVector.similarity(this.documentVectors[docRef][fieldName])
          })
        }
      }

    } else {
      for (var docRef in posting[fieldName]) {
        if (docRef == "idf" || docRef in matchingDocumentRefs) continue
        matchingDocumentRefs[docRef] = true
        results.push({
          ref: docRef,
          score: queryVector.similarity(this.documentVectors[docRef][fieldName])
        })
      }
    }
  }

  return results.sort(function (a, b) {
    return b.score - a.score
  })
}

// TODO: this is copied from the builder
// * store the idf for the ALL field right on the posting it self
// this will allow us to get rid of this
lunr.Index.prototype.idf = function (term, fieldName) {
  var posting = this.invertedIndex[term],
      documentsWithTerm = 0

  // sum all the fields if passed fieldName is undefined or ALL
  if (fieldName == undefined || fieldName == "ALL") {
    for (fieldName in posting) {
      documentsWithTerm += Object.keys(posting[fieldName]).length
    }
  } else {
    documentsWithTerm = Object.keys(posting[fieldName])
  }

  return (this.documentCount - documentsWithTerm + 0.5) / (documentsWithTerm + 0.5)
}